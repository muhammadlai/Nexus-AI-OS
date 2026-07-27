/**
 * ============================================================================
 * Nexus AI OS — EmotionClassifier
 * ----------------------------------------------------------------------------
 * Negation-aware, keyword-driven discrete emotion classifier. Iterates the
 * registry's enabled definitions and produces normalized emotion scores.
 * ============================================================================
 */

import { IEmotionClassifier, IEmotionRegistry } from './interfaces';
import { EmotionScore } from './types';
import { EmotionType } from './constants';
import {
  normalize,
  tokenize,
  countKeywordHits,
  saturate,
  clamp,
  normalizeScores,
} from './utils';

/** Deterministic emotion classifier backed by an emotion registry. */
export class EmotionClassifier implements IEmotionClassifier {
  constructor(private readonly registry: IEmotionRegistry) {}

  /** Classifies text into ranked, normalized emotion scores. */
  public classify(text: string): EmotionScore[] {
    const normalized = normalize(text);
    const tokens = tokenize(normalized);

    const raw: Record<string, number> = {};
    let totalHits = 0;

    for (const def of this.registry.listEnabled()) {
      if (def.type === EmotionType.Neutral) continue; // handled as fallback
      const hits = countKeywordHits(normalized, tokens, def.keywords);
      if (hits > 0) {
        raw[def.type] = saturate(hits, 1.5) * clamp(def.weight, 0.1, 2);
        totalHits += hits;
      }
    }

    // Fallback to Neutral when no emotional signal is present.
    if (totalHits === 0) {
      return [{ emotion: EmotionType.Neutral, score: 1 }];
    }

    const normalizedScores = normalizeScores(raw);
    return Object.entries(normalizedScores)
      .map(([emotion, score]) => ({ emotion, score }))
      .sort((a, b) => b.score - a.score);
  }
}
