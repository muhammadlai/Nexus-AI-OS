/**
 * ============================================================================
 * Nexus AI OS — IntentEngine
 * ----------------------------------------------------------------------------
 * The central Intent Engine. Orchestrates classification, entity extraction,
 * contextual refinement, ranking, validation, merging, and feedback-based
 * learning. Implements BrainCore's IIntentEngine via detect().
 *
 * All collaborators are dependency-injected, making the engine testable and
 * ready for future LLM (Gemini / OpenAI / OpenRouter) integration by simply
 * supplying an alternative IIntentClassifier and merging results.
 * ============================================================================
 */

import {
  IIntentEngine,
  IIntentClassifier,
  IEntityExtractor,
  IContextAnalyzer,
  IIntentRegistry,
} from './interfaces';
import {
  Intent,
  IntentAnalysis,
  IntentContext,
  IntentEntity,
  IntentFeedback,
  IntentPrediction,
  IntentEngineOptions,
} from './types';
import {
  INTENT_THRESHOLDS,
  INTENT_LIMITS,
  IntentName,
  FALLBACK_INTENT,
} from './constants';
import { normalize, clamp, iid } from './utils';
import { IntentClassifier } from './IntentClassifier';
import { EntityExtractor } from './EntityExtractor';
import { ContextAnalyzer } from './ContextAnalyzer';
import { IntentRegistry } from './IntentRegistry';

/** Dependencies injectable into the IntentEngine. */
export interface IntentEngineDeps {
  classifier?: IIntentClassifier;
  entityExtractor?: IEntityExtractor;
  contextAnalyzer?: IContextAnalyzer;
  registry?: IIntentRegistry;
  options?: IntentEngineOptions;
}

/** Internal learned-adjustment record used by learn(). */
interface LearnedAdjustment {
  boost: number;
  samples: number;
}

/**
 * The enterprise IntentEngine.
 */
export class IntentEngine implements IIntentEngine {
  private readonly classifier: IIntentClassifier;
  private readonly entityExtractor: IEntityExtractor;
  private readonly contextAnalyzer: IContextAnalyzer;
  private readonly registry: IIntentRegistry;

  private readonly minConfidence: number;
  private readonly maxPredictions: number;
  private readonly learningEnabled: boolean;
  private readonly version: string;

  /** Learned per-(inputKey|intent) confidence adjustments. */
  private readonly learned = new Map<string, LearnedAdjustment>();

  private initialized = false;

  constructor(deps: IntentEngineDeps = {}) {
    this.classifier = deps.classifier ?? new IntentClassifier();
    this.entityExtractor = deps.entityExtractor ?? new EntityExtractor();
    this.contextAnalyzer = deps.contextAnalyzer ?? new ContextAnalyzer();
    this.registry = deps.registry ?? new IntentRegistry();

    const opts = deps.options ?? {};
    this.minConfidence = opts.minConfidence ?? INTENT_THRESHOLDS.minConfidence;
    this.maxPredictions = opts.maxPredictions ?? INTENT_LIMITS.maxPredictions;
    this.learningEnabled = opts.learningEnabled ?? true;
    this.version = opts.version ?? '1.0.0';
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                           */
  /* ------------------------------------------------------------------ */

  /** Initializes the engine. Idempotent. */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    // Registry seeds itself on construction; nothing async required today,
    // but the hook exists for future model warm-up (embeddings, LLM, etc.).
    this.initialized = true;
  }

  /* ------------------------------------------------------------------ */
  /* BrainCore entry point                                               */
  /* ------------------------------------------------------------------ */

  /**
   * BrainCore-compatible detection. Returns a full IntentAnalysis whose
   * { name, confidence, entities } fields satisfy BrainCore's IntentResult.
   */
  public async detect(
    input: string,
    context?: IntentContext,
  ): Promise<IntentAnalysis> {
    return this.analyze(input, context);
  }

  /* ------------------------------------------------------------------ */
  /* Core analysis                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Full analysis pipeline: normalize -> classify -> context-bias ->
   * learned-adjust -> rank -> extract entities -> assemble result.
   */
  public async analyze(
    input: string,
    context?: IntentContext,
  ): Promise<IntentAnalysis> {
    const normalized = normalize(input);

    // 1. Base classification against enabled intents.
    let predictions = this.classifier.classify(
      normalized,
      this.registry.listEnabled(),
      context,
    );

    // 2. Contextual refinement.
    predictions = this.applyContext(predictions, context);

    // 3. Learned adjustments from prior feedback.
    predictions = this.applyLearned(normalized, predictions);

    // 4. Rank and truncate.
    predictions = this.rank(predictions).slice(0, this.maxPredictions);

    // 5. Entity extraction (over ORIGINAL input to preserve casing/spans).
    const entityList = this.entityExtractor.extract(input);
    const entities = this.groupEntities(entityList);

    // 6. Assemble result.
    const top = predictions[0] ?? this.unknownPrediction();
    const secondary = predictions
      .slice(1)
      .filter((p) => p.confidence.score >= INTENT_THRESHOLDS.secondaryConfidence);

    const ambiguous =
      predictions.length > 1 &&
      Math.abs(predictions[0].confidence.score - predictions[1].confidence.score) <=
        INTENT_THRESHOLDS.ambiguityMargin;

    return {
      name: top.name,
      confidence: top.confidence.score,
      entities,
      entityList,
      predictions,
      secondary,
      ambiguous,
      normalizedInput: normalized,
      metadata: {
        source: 'rules',
        version: this.version,
        analysisId: iid('ana'),
      },
      timestamp: Date.now(),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Public sub-operations                                              */
  /* ------------------------------------------------------------------ */

  /** Classifies without entity extraction or full assembly. */
  public classify(input: string, context?: IntentContext): IntentPrediction[] {
    const normalized = normalize(input);
    const base = this.classifier.classify(
      normalized,
      this.registry.listEnabled(),
      context,
    );
    return this.rank(this.applyContext(base, context));
  }

  /** Sorts predictions by score, then priority, descending. */
  public rank(predictions: IntentPrediction[]): IntentPrediction[] {
    return [...predictions].sort((a, b) => {
      const diff = b.confidence.score - a.confidence.score;
      return diff !== 0 ? diff : b.priority - a.priority;
    });
  }

  /** Returns the single best prediction. */
  public async predict(
    input: string,
    context?: IntentContext,
  ): Promise<IntentPrediction> {
    const predictions = this.classify(input, context);
    return predictions[0] ?? this.unknownPrediction();
  }

  /**
   * Merges multiple analyses (e.g. rule-based + LLM-based) by fusing
   * per-intent confidence and unioning entities. The highest fused intent
   * becomes the winner. Ready for future LLM ensembling.
   */
  public merge(...analyses: IntentAnalysis[]): IntentAnalysis {
    const valid = analyses.filter(Boolean);
    if (valid.length === 0) {
      return this.emptyAnalysis('');
    }
    if (valid.length === 1) return valid[0];

    // Fuse predictions by averaging scores across analyses.
    const fused = new Map<string, { total: number; count: number; priority: number }>();
    for (const a of valid) {
      for (const p of a.predictions) {
        const entry = fused.get(p.name) ?? { total: 0, count: 0, priority: p.priority };
        entry.total += p.confidence.score;
        entry.count += 1;
        entry.priority = Math.max(entry.priority, p.priority);
        fused.set(p.name, entry);
      }
    }

    const mergedPredictions: IntentPrediction[] = Array.from(fused.entries()).map(
      ([name, e]) => ({
        name,
        confidence: { score: clamp(e.total / e.count), model: e.total / e.count },
        priority: e.priority,
      }),
    );

    const ranked = this.rank(mergedPredictions).slice(0, this.maxPredictions);

    // Union entities (dedupe by type+value).
    const entityMap = new Map<string, IntentEntity>();
    for (const a of valid) {
      for (const e of a.entityList) {
        entityMap.set(`${e.type}:${e.value}`, e);
      }
    }
    const entityList = Array.from(entityMap.values());
    const entities = this.groupEntities(entityList);

    const top = ranked[0] ?? this.unknownPrediction();
    return {
      name: top.name,
      confidence: top.confidence.score,
      entities,
      entityList,
      predictions: ranked,
      secondary: ranked
        .slice(1)
        .filter((p) => p.confidence.score >= INTENT_THRESHOLDS.secondaryConfidence),
      ambiguous:
        ranked.length > 1 &&
        Math.abs(ranked[0].confidence.score - ranked[1].confidence.score) <=
          INTENT_THRESHOLDS.ambiguityMargin,
      normalizedInput: valid[0].normalizedInput,
      metadata: { source: 'merged', version: this.version, analysisId: iid('mrg') },
      timestamp: Date.now(),
    };
  }

  /** Validates that an analysis meets the minimum confidence contract. */
  public validate(analysis: IntentAnalysis): boolean {
    if (!analysis || typeof analysis.name !== 'string') return false;
    if (analysis.name === FALLBACK_INTENT) return false;
    return analysis.confidence >= this.minConfidence;
  }

  /**
   * Incorporates supervised feedback. Reinforces the correct intent and
   * gently penalizes an incorrect prediction for similar future inputs.
   */
  public learn(feedback: IntentFeedback): void {
    if (!this.learningEnabled) return;

    const key = this.learnKey(normalize(feedback.input), feedback.actual);
    const reward = clamp(feedback.reward ?? 0.1, -1, 1);

    const record = this.learned.get(key) ?? { boost: 0, samples: 0 };
    record.samples += 1;
    // Incremental average toward the reward, bounded to a small range.
    record.boost = clamp(
      record.boost + (reward - record.boost) / record.samples,
      -0.3,
      0.3,
    );
    this.learned.set(key, record);

    // Penalize the wrong prediction if it differs from the truth.
    if (feedback.predicted && feedback.predicted !== feedback.actual) {
      const wrongKey = this.learnKey(normalize(feedback.input), feedback.predicted);
      const wrong = this.learned.get(wrongKey) ?? { boost: 0, samples: 0 };
      wrong.samples += 1;
      wrong.boost = clamp(wrong.boost - 0.05, -0.3, 0.3);
      this.learned.set(wrongKey, wrong);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Registry delegation                                                 */
  /* ------------------------------------------------------------------ */

  /** Registers or updates a custom intent. */
  public registerIntent(def: Partial<Intent> & { name: string }): Intent {
    return this.registry.register(def);
  }

  /** Removes an intent by name. */
  public removeIntent(name: string): boolean {
    return this.registry.remove(name);
  }

  /** Lists all registered intents. */
  public listIntents(): Intent[] {
    return this.registry.list();
  }

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                    */
  /* ------------------------------------------------------------------ */

  /** Applies context biases to prediction scores. */
  private applyContext(
    predictions: IntentPrediction[],
    context?: IntentContext,
  ): IntentPrediction[] {
    if (!context) return predictions;
    const bias = this.contextAnalyzer.analyze(context, predictions);
    if (Object.keys(bias).length === 0) return predictions;

    return predictions.map((p) => {
      const delta = bias[p.name] ?? 0;
      if (delta === 0) return p;
      return {
        ...p,
        confidence: {
          ...p.confidence,
          context: delta,
          score: clamp(p.confidence.score + delta),
        },
      };
    });
  }

  /** Applies learned adjustments to prediction scores. */
  private applyLearned(
    normalizedInput: string,
    predictions: IntentPrediction[],
  ): IntentPrediction[] {
    if (!this.learningEnabled || this.learned.size === 0) return predictions;

    return predictions.map((p) => {
      const record = this.learned.get(this.learnKey(normalizedInput, p.name));
      if (!record || record.boost === 0) return p;
      return {
        ...p,
        confidence: {
          ...p.confidence,
          model: record.boost,
          score: clamp(p.confidence.score + record.boost),
        },
      };
    });
  }

  /** Builds a stable learning key from input signature + intent. */
  private learnKey(normalizedInput: string, intent: string): string {
    // Signature = first few content tokens to generalize across paraphrases.
    const signature = normalizedInput.split(' ').slice(0, 4).join(' ');
    return `${signature}::${intent}`;
  }

  /** Groups a rich entity list into a { type: value[] } map (BrainCore form). */
  private groupEntities(entities: IntentEntity[]): Record<string, unknown> {
    const grouped: Record<string, string[]> = {};
    for (const e of entities) {
      const bucket = grouped[e.type] ?? [];
      bucket.push(e.normalized ?? e.value);
      grouped[e.type] = bucket;
    }
    return grouped;
  }

  /** Returns the canonical unknown prediction. */
  private unknownPrediction(): IntentPrediction {
    return {
      name: IntentName.Unknown,
      confidence: { score: 0 },
      priority: 0,
    };
  }

  /** Builds an empty analysis for degenerate inputs. */
  private emptyAnalysis(input: string): IntentAnalysis {
    return {
      name: IntentName.Unknown,
      confidence: 0,
      entities: {},
      entityList: [],
      predictions: [this.unknownPrediction()],
      secondary: [],
      ambiguous: false,
      normalizedInput: normalize(input),
      metadata: { source: 'rules', version: this.version },
      timestamp: Date.now(),
    };
  }
}
