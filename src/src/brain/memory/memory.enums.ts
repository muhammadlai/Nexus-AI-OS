/**
 * ============================================================================
 * Nexus AI OS — Memory Enums
 * All memory tiers and importance levels.
 * ============================================================================
 */

/**
 * The distinct memory tiers managed by the engine. Each tier has different
 * durability, decay, and retrieval semantics.
 */
export enum MemoryType {
  LongTerm = 'long_term',
  ShortTerm = 'short_term',
  Working = 'working',
  Session = 'session',
  UserProfile = 'user_profile',
  Semantic = 'semantic',
  Conversation = 'conversation',
}

/**
 * Relative importance of a memory. Influences retention, ranking, and
 * eviction under memory pressure.
 */
export enum MemoryImportance {
  Trivial = 1,
  Low = 2,
  Normal = 3,
  High = 4,
  Critical = 5,
}
