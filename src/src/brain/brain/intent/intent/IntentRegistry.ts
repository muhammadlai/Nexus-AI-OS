/**
 * ============================================================================
 * Nexus AI OS — IntentRegistry
 * ----------------------------------------------------------------------------
 * Dynamic intent registration with priority and versioning. Seeded from the
 * built-in pattern library; supports custom intents added at runtime.
 * ============================================================================
 */

import { IIntentRegistry } from './interfaces';
import { Intent } from './types';
import {
  INTENT_PATTERNS,
  INTENT_PRIORITIES,
  IntentName,
} from './constants';

/**
 * In-memory registry of all intent definitions. Thread-safe within a single
 * runtime; backend-swappable behind IIntentRegistry for future persistence.
 */
export class IntentRegistry implements IIntentRegistry {
  private readonly intents = new Map<string, Intent>();

  constructor() {
    this.seedBuiltIns();
  }

  /**
   * Registers or updates an intent. Partial definitions are completed with
   * sensible defaults; re-registering bumps the version number.
   */
  public register(def: Partial<Intent> & { name: string }): Intent {
    const existing = this.intents.get(def.name);

    const intent: Intent = {
      name: def.name,
      description: def.description ?? existing?.description ?? '',
      keywords: def.keywords ?? existing?.keywords ?? [],
      patterns: def.patterns ?? existing?.patterns ?? [],
      weight: def.weight ?? existing?.weight ?? 1,
      priority: def.priority ?? existing?.priority ?? INTENT_PRIORITIES.normal,
      enabled: def.enabled ?? existing?.enabled ?? true,
      version: (existing?.version ?? 0) + 1,
      metadata: { ...(existing?.metadata ?? {}), ...(def.metadata ?? {}) },
    };

    this.intents.set(intent.name, intent);
    return intent;
  }

  /** Removes an intent by name. Built-in Unknown cannot be removed. */
  public remove(name: string): boolean {
    if (name === IntentName.Unknown) return false;
    return this.intents.delete(name);
  }

  /** Returns an intent definition by name. */
  public get(name: string): Intent | undefined {
    return this.intents.get(name);
  }

  /** Returns all registered intents. */
  public list(): Intent[] {
    return Array.from(this.intents.values());
  }

  /** Returns only enabled intents, sorted by descending priority. */
  public listEnabled(): Intent[] {
    return this.list()
      .filter((i) => i.enabled && i.name !== IntentName.Unknown)
      .sort((a, b) => b.priority - a.priority);
  }

  /** True if the named intent exists. */
  public has(name: string): boolean {
    return this.intents.has(name);
  }

  /** Enables or disables an intent. */
  public setEnabled(name: string, enabled: boolean): boolean {
    const intent = this.intents.get(name);
    if (!intent) return false;
    intent.enabled = enabled;
    return true;
  }

  /* ---------------------------- internals ---------------------------- */

  /** Seeds the registry from the built-in pattern library. */
  private seedBuiltIns(): void {
    for (const [name, def] of Object.entries(INTENT_PATTERNS)) {
      const priority = this.defaultPriorityFor(name as IntentName);
      this.intents.set(name, {
        name,
        description: `Built-in intent: ${name}`,
        keywords: [...def.keywords],
        patterns: [...def.patterns],
        weight: def.weight,
        priority,
        enabled: true,
        version: 1,
        metadata: { source: 'builtin' },
      });
    }
  }

  /** Assigns default priorities emphasizing control/system intents. */
  private defaultPriorityFor(name: IntentName): number {
    const high: IntentName[] = [
      IntentName.SystemControl,
      IntentName.TaskCancel,
      IntentName.TaskExecution,
      IntentName.Automation,
      IntentName.MemoryStore,
      IntentName.MemoryRecall,
    ];
    if (name === IntentName.Unknown) return INTENT_PRIORITIES.fallback;
    if (high.includes(name)) return INTENT_PRIORITIES.high;
    return INTENT_PRIORITIES.normal;
  }
}
