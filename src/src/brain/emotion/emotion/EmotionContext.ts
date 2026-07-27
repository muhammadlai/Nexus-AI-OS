/**
 * ============================================================================
 * Nexus AI OS — EmotionContext
 * ----------------------------------------------------------------------------
 * Converts contextual signals (previous emotion, history, topic, memory)
 * into small per-emotion score biases that refine — but never dominate —
 * the base classification.
 * ============================================================================
 */

import { IEmotionContext } from './interfaces';
import { EmotionContextData, EmotionScore } from './types';
import { EMOTION_LIMITS } from './constants';
import { clamp } from './utils';

/** Context-aware emotion bias generator. */
export class EmotionContext implements IEmotionContext {
  /**
   * @param continuityBias Bias toward the previously detected emotion.
   */
  constructor(private readonly continuityBias = 0.06) {}

  /** Produces a map of emotion -> additive bias delta. */
  public analyze(
    context: EmotionContextData | undefined,
    _scores: EmotionScore[],
  ): Record<string, number> {
    const bias: Record<string, number> = {};
    if (!context) return bias;

    this.applyPreviousEmotion(context, bias);
    this.applyEmotionHistory(context, bias);

    for (const key of Object.keys(bias)) {
      bias[key] = clamp(bias[key], -0.2, 0.2);
    }
    return bias;
  }

  /* ---------------------------- internals ---------------------------- */

  /** Slightly reinforces the previous emotion for continuity. */
  private applyPreviousEmotion(
    ctx: EmotionContextData,
    bias: Record<string, number>,
  ): void {
    if (ctx.previousEmotion) {
      bias[ctx.previousEmotion] =
        (bias[ctx.previousEmotion] ?? 0) + this.continuityBias;
    }
  }

  /** Reinforces emotions recurring in the recent history window. */
  private applyEmotionHistory(
    ctx: EmotionContextData,
    bias: Record<string, number>,
  ): void {
    const history = (ctx.emotionHistory ?? []).slice(
      -EMOTION_LIMITS.recentWindow,
    );
    if (history.length === 0) return;

    const counts = new Map<string, number>();
    for (const entry of history) {
      counts.set(entry.emotion, (counts.get(entry.emotion) ?? 0) + 1);
    }
    for (const [emotion, count] of counts) {
      bias[emotion] = (bias[emotion] ?? 0) + clamp(count * 0.015, 0, 0.09);
    }
  }
}
