/**
 * ============================================================================
 * Nexus AI OS — IntentClassifier
 * ----------------------------------------------------------------------------
 * Rule-based, multi-intent classifier producing ranked predictions with
 * confidence breakdowns. Designed as the deterministic baseline that a
 * future LLM classifier can be composed with (see IntentEngine.merge()).
 * ============================================================================
 */

import { IIntentClassifier } from './interfaces';
import {
  Intent,
  IntentContext,
  IntentPrediction,
  IntentConfidence,
} from './types';
import { INTENT_THRESHOLDS, IntentName, INTENT_PRIORITIES } from './constants';
import {
  countKeywordHits,
  countPatternHits,
  saturate,
  blendConfidence,
  clamp,
} from './utils';

/**
 * Deterministic keyword/pattern classifier. Produces per-intent scores by
 * blending keyword saturation, pattern saturation, and intent weight.
 */
export class IntentClassifier implements IIntentClassifier {
  /**
   * @param keywordWeight Relative weight of keyword signal.
   * @param patternWeight Relative weight of pattern signal.
   */
  constructor(
    private readonly keywordWeight = 0.55,
    private readonly patternWeight = 0.45,
  ) {}

  /** Classifies input across the supplied intents. */
  public classify(
    input: string,
    intents: Intent[],
    _context?: IntentContext,
  ): IntentPrediction[] {
    const predictions: IntentPrediction[] = [];

    for (const intent of intents) {
      const prediction = this.scoreIntent(input, intent);
      if (prediction.confidence.score >= INTENT_THRESHOLDS.minConfidence) {
        predictions.push(prediction);
      }
    }

    if (predictions.length === 0) {
      predictions.push(this.fallbackPrediction());
    }

    return predictions.sort((a, b) => {
      const diff = b.confidence.score - a.confidence.score;
      return diff !== 0 ? diff : b.priority - a.priority;
    });
  }

  /* ---------------------------- internals ---------------------------- */

  /** Computes a scored prediction for a single intent. */
  private scoreIntent(input: string, intent: Intent): IntentPrediction {
    const keywordHits = countKeywordHits(input, intent.keywords);
    const patternHits = countPatternHits(input, intent.patterns);

    const keywordScore = saturate(keywordHits, 1.5);
    const patternScore = saturate(patternHits, 1.0);

    const base = blendConfidence([
      { value: keywordScore, weight: this.keywordWeight },
      { value: patternScore, weight: this.patternWeight },
    ]);

    // Apply the intent's inherent weight as a gentle multiplier.
    const weighted = clamp(base * clamp(intent.weight, 0.1, 1.5));

    const confidence: IntentConfidence = {
      score: weighted,
      keyword: keywordScore,
      pattern: patternScore,
    };

    return {
      name: intent.name,
      confidence,
      priority: intent.priority,
    };
  }

  /** Builds the fallback prediction when nothing matches. */
  private fallbackPrediction(): IntentPrediction {
    return {
      name: IntentName.Unknown,
      confidence: { score: 0, keyword: 0, pattern: 0 },
      priority: INTENT_PRIORITIES.fallback,
    };
  }
}
