/**
 * ============================================================================
 * Nexus AI OS — SentimentAnalyzer
 * ----------------------------------------------------------------------------
 * Lexicon-based, negation-aware sentiment analysis producing polarity,
 * positive/negative strengths, a mixed label, and confidence. Fully offline.
 * ============================================================================
 */

import { ISentimentAnalyzer } from './interfaces';
import { SentimentResult, SentimentLabel, Sentiment } from './types';
import {
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
  EMOTION_THRESHOLDS,
} from './constants';
import {
  normalize,
  tokenize,
  countKeywordHits,
  saturate,
  clamp,
} from './utils';

/** Deterministic sentiment analyzer. */
export class SentimentAnalyzer implements ISentimentAnalyzer {
  /** Analyzes text and returns a structured sentiment result. */
  public analyze(text: string): SentimentResult {
    const normalized = normalize(text);
    const tokens = tokenize(normalized);

    const posHits = countKeywordHits(normalized, tokens, POSITIVE_WORDS);
    const negHits = countKeywordHits(normalized, tokens, NEGATIVE_WORDS);

    const positive = saturate(posHits, 1.5);
    const negative = saturate(negHits, 1.5);

    // Signed polarity in [-1, 1].
    const score = clamp(positive - negative, -1, 1);

    const label = this.deriveLabel(positive, negative, score);
    const sentiment = this.toSentiment(label, score);
    const confidence = clamp(Math.max(positive, negative));

    return { label, sentiment, score, positive, negative, confidence };
  }

  /* ---------------------------- internals ---------------------------- */

  /** Derives the extended label, detecting mixed polarity. */
  private deriveLabel(
    positive: number,
    negative: number,
    score: number,
  ): SentimentLabel {
    const bothStrong =
      positive >= EMOTION_THRESHOLDS.mixedThreshold &&
      negative >= EMOTION_THRESHOLDS.mixedThreshold;
    if (bothStrong) return 'mixed';
    if (score > EMOTION_THRESHOLDS.sentimentMargin) return 'positive';
    if (score < -EMOTION_THRESHOLDS.sentimentMargin) return 'negative';
    return 'neutral';
  }

  /** Collapses an extended label to a BrainCore-compatible sentiment. */
  private toSentiment(label: SentimentLabel, score: number): Sentiment {
    if (label === 'positive') return 'positive';
    if (label === 'negative') return 'negative';
    if (label === 'mixed') {
      if (score > 0.05) return 'positive';
      if (score < -0.05) return 'negative';
      return 'neutral';
    }
    return 'neutral';
  }
}
