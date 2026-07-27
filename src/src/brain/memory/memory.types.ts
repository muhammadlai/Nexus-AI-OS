/**
 * ============================================================================
 * Nexus AI OS — Memory Types
 * Core interfaces for records, queries, results, and knowledge graph.
 * ============================================================================
 */

import { MemoryType, MemoryImportance } from './memory.enums';

/**
 * A single stored memory record. This is the atomic unit of the engine.
 * @template T The type of the stored value/payload.
 */
export interface MemoryRecord<T = unknown> {
  /** Globally unique identifier for this memory record. */
  id: string;
  /** Human/machine key used for direct lookup (unique per record). */
  key: string;
  /** The stored payload. */
  value: T;
  /** Which memory tier this record belongs to. */
  type: MemoryType;
  /** Free-form tags used for grouping and filtered search. */
  tags: string[];
  /** Importance score driving retention and ranking. */
  importance: MemoryImportance;
  /** Optional owning user id (for user-scoped memories). */
  userId?: string;
  /** Optional session id (for session-scoped memories). */
  sessionId?: string;
  /** Optional conversation id (for conversation memories). */
  conversationId?: string;
  /** Optional semantic embedding vector for similarity search. */
  embedding?: number[];
  /** Arbitrary metadata for future extension. */
  metadata: Record<string, unknown>;
  /** Epoch ms when the record was created. */
  createdAt: number;
  /** Epoch ms when the record was last updated. */
  updatedAt: number;
  /** Epoch ms when the record was last accessed (for decay/recency). */
  accessedAt: number;
  /** Number of times this record has been recalled. */
  accessCount: number;
  /** Optional absolute expiry timestamp (epoch ms). Undefined = never. */
  expiresAt?: number;
}

/** Options accepted when saving a memory. */
export interface SaveMemoryOptions {
  /** Target memory tier. Defaults to MemoryType.LongTerm. */
  type?: MemoryType;
  /** Tags for grouping/search. */
  tags?: string[];
  /** Importance score. Defaults to MemoryImportance.Normal. */
  importance?: MemoryImportance;
  /** Owning user id. */
  userId?: string;
  /** Session id scope. */
  sessionId?: string;
  /** Conversation id scope. */
  conversationId?: string;
  /** Semantic embedding vector. */
  embedding?: number[];
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>;
  /** Time-to-live in milliseconds. Converted to an absolute expiry. */
  ttlMs?: number;
}

/** Query used to search/filter memories. */
export interface MemoryQuery {
  /** Free-text query matched against value/key/tags. */
  text?: string;
  /** Restrict to specific memory tiers. */
  types?: MemoryType[];
  /** Match records containing ALL of these tags. */
  tags?: string[];
  /** Restrict to a user. */
  userId?: string;
  /** Restrict to a session. */
  sessionId?: string;
  /** Restrict to a conversation. */
  conversationId?: string;
  /** Minimum importance threshold. */
  minImportance?: MemoryImportance;
  /** Optional embedding for semantic similarity ranking. */
  embedding?: number[];
  /** Maximum number of results to return. Defaults to 20. */
  limit?: number;
  /** Include expired records in results. Defaults to false. */
  includeExpired?: boolean;
}

/** A single scored search result. */
export interface MemorySearchResult<T = unknown> {
  record: MemoryRecord<T>;
  /** Relevance score in the range [0, 1]. */
  score: number;
}

/** A node within the knowledge graph. */
export interface KnowledgeNode {
  id: string;
  /** Entity label, e.g. "Paris", "User", "Invoice #42". */
  label: string;
  /** Entity type/category, e.g. "city", "person", "document". */
  type: string;
  /** Arbitrary properties for the entity. */
  properties: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/** A directed, typed edge between two knowledge nodes. */
export interface KnowledgeEdge {
  id: string;
  /** Source node id. */
  from: string;
  /** Target node id. */
  to: string;
  /** Relationship type, e.g. "located_in", "owns", "knows". */
  relation: string;
  /** Optional edge weight/strength. */
  weight?: number;
  properties: Record<string, unknown>;
  createdAt: number;
}

/** Aggregated, ready-to-consume context for the reasoning pipeline. */
export interface RetrievedContext {
  /** Highest-ranked relevant memories. */
  relevant: MemoryRecord[];
  /** Recent short-term / working memories. */
  recent: MemoryRecord[];
  /** Conversation history (chronological). */
  conversation: MemoryRecord[];
  /** User profile facts, if a user was specified. */
  profile: MemoryRecord[];
  /** Related knowledge graph nodes. */
  knowledge: KnowledgeNode[];
}

/** Snapshot statistics describing engine state. */
export interface MemoryStats {
  total: number;
  byType: Record<MemoryType, number>;
  expired: number;
  knowledgeNodes: number;
  knowledgeEdges: number;
}

/** Configuration options for the MemoryEngine. */
export interface MemoryEngineConfig {
  /** Custom persistence backend. Defaults to InMemoryStore. */
  store?: IMemoryStore;
  /** Default TTL (ms) applied to short-term memories. Default: 30 min. */
  shortTermTtlMs?: number;
  /** Default TTL (ms) applied to working memories. Default: 5 min. */
  workingTtlMs?: number;
  /** Maximum number of working-memory items retained. Default: 50. */
  maxWorkingItems?: number;
  /** How often (ms) the background cleanup runs. Default: 60s. 0 disables. */
  cleanupIntervalMs?: number;
  /** Weight applied to recency in ranking [0..1]. Default: 0.3. */
  recencyWeight?: number;
  /** Weight applied to importance in ranking [0..1]. Default: 0.3. */
  importanceWeight?: number;
  /** Weight applied to relevance in ranking [0..1]. Default: 0.4. */
  relevanceWeight?: number;
}

/**
 * Persistence contract for memory records. All methods are async to allow
 * remote/distributed backends (Redis, Postgres, DynamoDB, etc.).
 */
export interface IMemoryStore {
  get(id: string): Promise<MemoryRecord | undefined>;
  getByKey(key: string): Promise<MemoryRecord | undefined>;
  put(record: MemoryRecord): Promise<void>;
  delete(id: string): Promise<boolean>;
  deleteByKey(key: string): Promise<boolean>;
  all(): Promise<MemoryRecord[]>;
  clear(): Promise<void>;
}
