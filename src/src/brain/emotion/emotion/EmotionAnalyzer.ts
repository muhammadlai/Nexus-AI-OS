/**
 * ============================================================================
 * Nexus AI OS — EmotionAnalyzer
 * ----------------------------------------------------------------------------
 * Orchestrates classification, sentiment, intensity, and confidence into a
 * complete EmotionResult. Context biasing is supplied by the caller as a
 * pre-computed delta map, keeping this component pure and testable.
 * ============================================================================
 */

import {
  IEmotionAnalyzer,
  IEmotionClassifier,
  ISentimentAnalyzer,
  IEmotionRegistry,
} from './interfaces';
import { EmotionResult, EmotionScore, SentimentLabel } from './types';
import { EmotionType, EMOTION_THRESHOLDS } from './constants';
import {
  normalize,
  tokenize,
  countIntensifiers,
  capsRatio,
  exclamationBoost,
  clamp,
  normalizeScores,
  computeConfidence,
  eid,
} from './utils';

/** Combines all signals into a structured emotion result. */
export class EmotionAnalyzer implements IEmotionAnalyzer {
  constructor(
    private readonly classifier: IEmotionClassifier,
    private readonly sentiment: ISentimentAnalyzer,
    private readonly registry: IEmotionRegistry,
  ) {}

  /** Full analysis. Optional `biases` add per-emotion score deltas. */
  public analyze(text: string, biases: Record<string, number> = {}): EmotionResult {
    const normalized = normalize(text);
    const tokens = tokenize(normalized);

    // 1. Base classification, then apply context biases and re-normalize.
    const baseScores = this.classifier.classify(text);
    const biased = this.applyBiases(baseScores, biases);
    const ranked = biased.sort((a, b) => b.score - a.score);

    // 2. Sentiment analysis.
    const sentimentResult = this.sentiment.analyze(text);

    // 3. Primary / secondary.
    const primary = ranked[0]?.emotion ?? EmotionType.Neutral;
    const secondaryScore = ranked[1];
    const secondary =
      secondaryScore && secondaryScore.score >= EMOTION_THRESHOLDS.minScore
        ? secondaryScore.emotion
        : undefined;

    // 4. Intensity (0..100) & normalized (0..1).
    const intensityNormalized = this.computeIntensity(
      ranked,
      tokens,
      text,
    );
    const intensity = Math.round(intensityNormalized * 100);

    // 5. Confidence.
    const confidence = computeConfidence(ranked.map((r) => r.score));

    // 6. Ambiguity.
    const ambiguous =
      ranked.length > 1 &&
      Math.abs(ranked[0].score - ranked[1].score) <=
        EMOTION_THRESHOLDS.ambiguityMargin;

    // 7. Reconcile sentiment with the dominant discrete emotion.
    const { sentiment, sentimentLabel } = this.reconcileSentiment(
      primary,
      sentimentResult.sentiment,
      sentimentResult.label,
    );

    const scores: Record<string, number> = {};
    for (const r of ranked) scores[r.emotion] = r.score;

    return {
      primary,
      secondary,
      intensity,
      intensityNormalized,
      confidence,
      sentiment,
      sentimentLabel,
      scores,
      emotions: ranked,
      ambiguous,
      timestamp: Date.now(),
      metadata: {
        analysisId: eid('ana'),
        sentimentScore: sentimentResult.score,
        positive: sentimentResult.positive,
        negative: sentimentResult.negative,
      },
    };
  }

  /* ---------------------------- internals ---------------------------- */

  /** Adds bias deltas to scores and re-normalizes. */
  private applyBiases(
    scores: EmotionScore[],
    biases: Record<string, number>,
  ): EmotionScore[] {
    if (Object.keys(biases).length === 0) return scores;

    const raw: Record<string, number> = {};
    for (const s of scores) {
      raw[s.emotion] = clamp(s.score + (biases[s.emotion] ?? 0), 0, 2);
    }
    // Include biased emotions not present in the base scores.
    for (const [emotion, delta] of Object.entries(biases)) {
      if (!(emotion in raw) && delta > 0) raw[emotion] = clamp(delta, 0, 2);
    }
    const normalized = normalizeScores(raw);
    return Object.entries(normalized).map(([emotion, score]) => ({
      emotion,
      score,
    }));
  }

  /**
   * Derives intensity from the dominant score plus linguistic amplifiers
   * (intensifiers, capitalization, exclamation marks).
   */
  private computeIntensity(
    ranked: EmotionScore[],
    tokens: string[],
    rawText: string,
  ): number {
    const top = ranked[0]?.score ?? 0;
    if (ranked[0]?.emotion === EmotionType.Neutral) {
      return clamp(top * 0.2);
    }

    const base = top * 0.6;
    const intensifierBoost = clamp(countIntensifiers(tokens) * 0.12, 0, 0.24);
    const capsBoost = clamp(capsRatio(rawText) * 0.1, 0, 0.1);
    const exclaimBoost = exclamationBoost(rawText) * 0.15;

    return clamp(base + intensifierBoost + capsBoost + exclaimBoost);
  }

  /**
   * Reconciles lexical sentiment with the dominant emotion's canonical
   * sentiment. The emotion's sentiment takes precedence when confident.
   */
  private reconcileSentiment(
    primary: string,
    lexicalSentiment: EmotionResult['sentiment'],
    lexicalLabel: SentimentLabel,
  ): { sentiment: EmotionResult['sentiment']; sentimentLabel: SentimentLabel } {
    const def = this.registry.get(primary);
    if (!def || primary === EmotionType.Neutral) {
      return { sentiment: lexicalSentiment, sentimentLabel: lexicalLabel };
    }
    // If lexical detected mixed, preserve the mixed label but align sentiment.
    if (lexicalLabel === 'mixed') {
      return { sentiment: def.sentiment, sentimentLabel: 'mixed' };
    }
    return { sentiment: def.sentiment, sentimentLabel: def.sentiment };
  }
}
