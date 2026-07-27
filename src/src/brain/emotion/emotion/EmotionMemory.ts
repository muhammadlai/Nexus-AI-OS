/**
 * ============================================================================
 * Nexus AI OS — EmotionMemory
 * ----------------------------------------------------------------------------
 * Persists an emotional timeline for recall and contextual awareness.
 * Storage is abstracted in-memory here and can be backed by MemoryEngine or
 * a database via the same IEmotionMemory contract.
 * ============================================================================
 */

import { IEmotionMemory } from './interfaces';
import { EmotionTimeline, EmotionTimelineEntry } from './types';
import { EMOTION_LIMITS } from './constants';

/** In-memory emotional timeline store. */
export class EmotionMemory implements IEmotionMemory {
  private readonly timeline: EmotionTimelineEntry[] = [];

  /** Appends an emotion entry, trimming to capacity. */
  public remember(entry: EmotionTimelineEntry): void {
    this.timeline.push(entry);
    if (this.timeline.length > EMOTION_LIMITS.maxMemoryTimeline) {
      this.timeline.splice(
        0,
        this.timeline.length - EMOTION_LIMITS.maxMemoryTimeline,
      );
    }
  }

  /** Recalls the most recent N entries (default = recent window). */
  public recall(count = EMOTION_LIMITS.recentWindow): EmotionTimeline {
    return this.timeline.slice(-count);
  }

  /** Returns the full emotional timeline. */
  public getTimeline(): EmotionTimeline {
    return [...this.timeline];
  }

  /** Clears the stored timeline. */
  public clear(): void {
    this.timeline.length = 0;
  }
}
