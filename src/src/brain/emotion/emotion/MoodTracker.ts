/**
 * ============================================================================
 * Nexus AI OS — MoodTracker
 * ----------------------------------------------------------------------------
 * Tracks long-term mood by aggregating an emotion timeline: recent emotions,
 * average valence, dominant emotion, and trend (improving/declining/etc.).
 * ============================================================================
 */

import { IMoodTracker } from './interfaces';
import {
  EmotionTimeline,
  EmotionTimelineEntry,
  MoodState,
  MoodTrend,
  SentimentLabel,
} from './types';
import { EMOTION_LIMITS } from './constants';
import { average, variance, clamp } from './utils';

/** In-memory long-term mood tracker. */
export class MoodTracker implements IMoodTracker {
  private readonly history: EmotionTimelineEntry[] = [];

  /** Records an emotion sample, trimming to the configured capacity. */
  public track(entry: EmotionTimelineEntry): void {
    this.history.push(entry);
    if (this.history.length > EMOTION_LIMITS.maxMoodHistory) {
      this.history.splice(0, this.history.length - EMOTION_LIMITS.maxMoodHistory);
    }
  }

  /** Computes the aggregated current mood state. */
  public getCurrentMood(): MoodState {
    if (this.history.length === 0) {
      return {
        dominantEmotion: 'neutral',
        label: 'neutral',
        valence: 0,
        intensity: 0,
        trend: 'stable',
        sampleSize: 0,
        updatedAt: Date.now(),
      };
    }

    const recent = this.getRecent(EMOTION_LIMITS.recentWindow);
    const valence = average(recent.map((e) => e.valence));
    const intensity = average(recent.map((e) => e.intensity));

    return {
      dominantEmotion: this.dominantEmotion(recent),
      label: this.valenceToLabel(valence),
      valence,
      intensity,
      trend: this.getTrend(),
      sampleSize: recent.length,
      updatedAt: Date.now(),
    };
  }

  /** Average valence across the full tracked history in [-1, 1]. */
  public getAverageMood(): number {
    return average(this.history.map((e) => e.valence));
  }

  /** Returns the full mood history. */
  public getHistory(): EmotionTimeline {
    return [...this.history];
  }

  /** Returns the most recent N entries. */
  public getRecent(count = EMOTION_LIMITS.recentWindow): EmotionTimeline {
    return this.history.slice(-count);
  }

  /** Derives the mood trend from valence dynamics. */
  public getTrend(): MoodTrend {
    const recent = this.getRecent(EMOTION_LIMITS.recentWindow);
    if (recent.length < 4) return 'stable';

    const valences = recent.map((e) => e.valence);
    if (variance(valences) > 0.25) return 'volatile';

    const mid = Math.floor(valences.length / 2);
    const older = average(valences.slice(0, mid));
    const newer = average(valences.slice(mid));
    const delta = newer - older;

    if (delta > 0.15) return 'improving';
    if (delta < -0.15) return 'declining';
    return 'stable';
  }

  /** Clears all tracked mood data. */
  public reset(): void {
    this.history.length = 0;
  }

  /* ---------------------------- internals ---------------------------- */

  /** Finds the most frequent emotion in a set of entries. */
  private dominantEmotion(entries: EmotionTimelineEntry[]): string {
    const counts = new Map<string, number>();
    for (const e of entries) {
      counts.set(e.emotion, (counts.get(e.emotion) ?? 0) + 1);
    }
    let best = 'neutral';
    let bestCount = -1;
    for (const [emotion, count] of counts) {
      if (count > bestCount) {
        best = emotion;
        bestCount = count;
      }
    }
    return best;
  }

  /** Maps a valence value to an extended sentiment label. */
  private valenceToLabel(valence: number): SentimentLabel {
    const v = clamp(valence, -1, 1);
    if (v > 0.15) return 'positive';
    if (v < -0.15) return 'negative';
    return 'neutral';
  }
}
