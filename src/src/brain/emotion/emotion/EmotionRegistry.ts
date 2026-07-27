/**
 * ============================================================================
 * Nexus AI OS — EmotionRegistry
 * ----------------------------------------------------------------------------
 * Dynamic registry of emotion definitions. Seeded from the built-in catalog;
 * supports custom emotions registered at runtime. Backend-swappable behind
 * IEmotionRegistry for future persistence.
 * ============================================================================
 */

import { IEmotionRegistry } from './interfaces';
import { EmotionDefinition } from './types';
import {
  EMOTION_KEYWORDS,
  EMOTION_VALENCE,
  EMOTION_SENTIMENT,
  EmotionType,
} from './constants';

/** In-memory emotion definition registry. */
export class EmotionRegistry implements IEmotionRegistry {
  private readonly definitions = new Map<string, EmotionDefinition>();

  constructor() {
    this.seedBuiltIns();
  }

  /** Registers or updates an emotion definition. */
  public register(
    def: Partial<EmotionDefinition> & { type: string },
  ): EmotionDefinition {
    const existing = this.definitions.get(def.type);
    const definition: EmotionDefinition = {
      type: def.type,
      keywords: def.keywords ?? existing?.keywords ?? [],
      valence: def.valence ?? existing?.valence ?? 0,
      sentiment: def.sentiment ?? existing?.sentiment ?? 'neutral',
      weight: def.weight ?? existing?.weight ?? 1,
      enabled: def.enabled ?? existing?.enabled ?? true,
    };
    this.definitions.set(definition.type, definition);
    return definition;
  }

  /** Removes an emotion. The built-in Neutral emotion cannot be removed. */
  public remove(type: string): boolean {
    if (type === EmotionType.Neutral) return false;
    return this.definitions.delete(type);
  }

  /** Returns a definition by type. */
  public get(type: string): EmotionDefinition | undefined {
    return this.definitions.get(type);
  }

  /** Returns all definitions. */
  public list(): EmotionDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** Returns only enabled definitions. */
  public listEnabled(): EmotionDefinition[] {
    return this.list().filter((d) => d.enabled);
  }

  /** True if a definition exists. */
  public has(type: string): boolean {
    return this.definitions.has(type);
  }

  /* ---------------------------- internals ---------------------------- */

  /** Seeds the registry from the built-in emotion catalog. */
  private seedBuiltIns(): void {
    for (const emotion of Object.values(EmotionType)) {
      this.definitions.set(emotion, {
        type: emotion,
        keywords: [...EMOTION_KEYWORDS[emotion]],
        valence: EMOTION_VALENCE[emotion],
        sentiment: EMOTION_SENTIMENT[emotion],
        weight: 1,
        enabled: true,
      });
    }
  }
}
