/**
 * ============================================================================
 * Nexus AI OS — MemoryEngine
 * ----------------------------------------------------------------------------
 * Enterprise-grade, multi-tier cognitive memory store.
 *
 * Tiers: long-term, short-term, working, session, user-profile, semantic,
 * conversation — plus a knowledge graph. Supports search, tagging,
 * importance scoring, expiration (TTL), decay, and rich context retrieval.
 *
 * Fully async, fully typed, storage-agnostic (clean architecture).
 * ============================================================================
 */

import { MemoryType, MemoryImportance } from './memory.enums';
import {
  MemoryRecord,
  SaveMemoryOptions,
  MemoryQuery,
  MemorySearchResult,
  KnowledgeNode,
  KnowledgeEdge,
  RetrievedContext,
  MemoryStats,
  MemoryEngineConfig,
  IMemoryStore,
} from './memory.types';
import { InMemoryStore } from './memory.store';
import {
  generateId,
  cosineSimilarity,
  textRelevance,
  stringifyValue,
} from './memory.utils';

/**
 * The enterprise MemoryEngine for Nexus AI OS.
 *
 * @example
 * ```ts
 * const memory = new MemoryEngine();
 * await memory.initialize();
 * await memory.save('user:name', 'Ali', { type: MemoryType.UserProfile });
 * const name = await memory.recall<string>('user:name');
 * ```
 */
export class MemoryEngine {
  /* ---- Storage & knowledge graph ---- */
  private readonly store: IMemoryStore;
  private readonly nodes = new Map<string, KnowledgeNode>();
  private readonly edges = new Map<string, KnowledgeEdge>();

  /* ---- Configuration ---- */
  private readonly shortTermTtlMs: number;
  private readonly workingTtlMs: number;
  private readonly maxWorkingItems: number;
  private readonly cleanupIntervalMs: number;
  private readonly recencyWeight: number;
  private readonly importanceWeight: number;
  private readonly relevanceWeight: number;

  /* ---- Runtime ---- */
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  /** Creates a new MemoryEngine. */
  constructor(config: MemoryEngineConfig = {}) {
    this.store = config.store ?? new InMemoryStore();
    this.shortTermTtlMs = config.shortTermTtlMs ?? 30 * 60 * 1000;
    this.workingTtlMs = config.workingTtlMs ?? 5 * 60 * 1000;
    this.maxWorkingItems = config.maxWorkingItems ?? 50;
    this.cleanupIntervalMs = config.cleanupIntervalMs ?? 60 * 1000;
    this.recencyWeight = config.recencyWeight ?? 0.3;
    this.importanceWeight = config.importanceWeight ?? 0.3;
    this.relevanceWeight = config.relevanceWeight ?? 0.4;
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                           */
  /* ------------------------------------------------------------------ */

  /** Initializes the engine and starts the background cleanup loop. */
  public async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    if (this.cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => {
        void this.pruneExpired().catch(() => undefined);
      }, this.cleanupIntervalMs);

      if (
        this.cleanupTimer &&
        typeof (this.cleanupTimer as { unref?: () => void }).unref === 'function'
      ) {
        (this.cleanupTimer as { unref: () => void }).unref();
      }
    }
  }

  /** Stops background timers and releases resources. */
  public async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.initialized = false;
  }

  /* ------------------------------------------------------------------ */
  /* Primary Save / Recall API                                          */
  /* ------------------------------------------------------------------ */

  /** Saves (creates or updates) a memory record under a unique key. */
  public async save<T = unknown>(
    key: string,
    value: T,
    opts: SaveMemoryOptions = {},
  ): Promise<MemoryRecord<T>> {
    const now = Date.now();
    const type = opts.type ?? MemoryType.LongTerm;

    // Resolve TTL: explicit ttl wins, else apply tier defaults.
    let expiresAt: number | undefined;
    if (typeof opts.ttlMs === 'number') {
      expiresAt = now + opts.ttlMs;
    } else if (type === MemoryType.ShortTerm) {
      expiresAt = now + this.shortTermTtlMs;
    } else if (type === MemoryType.Working) {
      expiresAt = now + this.workingTtlMs;
    }

    const existing = await this.store.getByKey(key);

    const record: MemoryRecord<T> = {
      id: existing?.id ?? generateId(),
      key,
      value,
      type,
      tags: opts.tags ?? existing?.tags ?? [],
      importance:
        opts.importance ?? existing?.importance ?? MemoryImportance.Normal,
      userId: opts.userId ?? existing?.userId,
      sessionId: opts.sessionId ?? existing?.sessionId,
      conversationId: opts.conversationId ?? existing?.conversationId,
      embedding: opts.embedding ?? existing?.embedding,
      metadata: { ...(existing?.metadata ?? {}), ...(opts.metadata ?? {}) },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      accessedAt: now,
      accessCount: existing?.accessCount ?? 0,
      expiresAt,
    };

    await this.store.put(record as MemoryRecord);

    if (type === MemoryType.Working) {
      await this.enforceWorkingLimit();
    }

    return record;
  }

  /** Recalls a stored value by key. Honors expiration. */
  public async recall<T = unknown>(key: string): Promise<T | undefined> {
    const record = await this.getRecord<T>(key);
    return record ? (record.value as T) : undefined;
  }

  /** Retrieves the full MemoryRecord by key. Updates access stats. */
  public async getRecord<T = unknown>(
    key: string,
  ): Promise<MemoryRecord<T> | undefined> {
    const record = await this.store.getByKey(key);
    if (!record) return undefined;

    if (this.isExpired(record)) {
      await this.store.delete(record.id);
      return undefined;
    }

    record.accessedAt = Date.now();
    record.accessCount += 1;
    await this.store.put(record);

    return record as MemoryRecord<T>;
  }

  /* ------------------------------------------------------------------ */
  /* BrainCore IMemoryEngine contract methods                           */
  /* ------------------------------------------------------------------ */

  /** IMemoryEngine.retrieve — recalls a value by key. */
  public async retrieve<T = unknown>(key: string): Promise<T | undefined> {
    return this.recall<T>(key);
  }

  /** IMemoryEngine.forget — deletes a memory by key. */
  public async forget(key: string): Promise<void> {
    await this.store.deleteByKey(key);
  }

  /* ------------------------------------------------------------------ */
  /* Convenience tier-specific writers                                  */
  /* ------------------------------------------------------------------ */

  /** Saves a long-term (durable) memory. */
  public saveLongTerm<T>(key: string, value: T, opts: SaveMemoryOptions = {}) {
    return this.save(key, value, { ...opts, type: MemoryType.LongTerm });
  }

  /** Saves a short-term (auto-expiring) memory. */
  public saveShortTerm<T>(key: string, value: T, opts: SaveMemoryOptions = {}) {
    return this.save(key, value, { ...opts, type: MemoryType.ShortTerm });
  }

  /** Saves a working-memory (active scratchpad) item. */
  public saveWorking<T>(key: string, value: T, opts: SaveMemoryOptions = {}) {
    return this.save(key, value, { ...opts, type: MemoryType.Working });
  }

  /** Saves a session-scoped memory. */
  public saveSession<T>(
    sessionId: string,
    key: string,
    value: T,
    opts: SaveMemoryOptions = {},
  ) {
    return this.save(key, value, {
      ...opts,
      type: MemoryType.Session,
      sessionId,
    });
  }

  /** Saves or updates a per-user profile fact. */
  public saveUserProfile<T>(
    userId: string,
    key: string,
    value: T,
    opts: SaveMemoryOptions = {},
  ) {
    return this.save(`user:${userId}:${key}`, value, {
      ...opts,
      type: MemoryType.UserProfile,
      userId,
      importance: opts.importance ?? MemoryImportance.High,
    });
  }

  /** Saves a semantic memory with an embedding for similarity search. */
  public saveSemantic<T>(
    key: string,
    value: T,
    embedding: number[],
    opts: SaveMemoryOptions = {},
  ) {
    return this.save(key, value, {
      ...opts,
      type: MemoryType.Semantic,
      embedding,
    });
  }

  /** Appends a conversation turn to conversation memory. */
  public async saveConversationTurn(
    conversationId: string,
    turn: { role: string; content: string; [k: string]: unknown },
    opts: SaveMemoryOptions = {},
  ): Promise<MemoryRecord> {
    const key = `conv:${conversationId}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    return this.save(key, turn, {
      ...opts,
      type: MemoryType.Conversation,
      conversationId,
    });
  }

  /* ------------------------------------------------------------------ */
  /* Search                                                              */
  /* ------------------------------------------------------------------ */

  /** Searches memories using free-text or a structured MemoryQuery. */
  public async search<T = unknown>(
    query: string | MemoryQuery,
  ): Promise<MemorySearchResult<T>[]> {
    const q: MemoryQuery =
      typeof query === 'string' ? { text: query } : { ...query };

    const limit = q.limit ?? 20;
    const all = await this.store.all();
    const newest = all.reduce((max, r) => Math.max(max, r.accessedAt), 1);

    const results: MemorySearchResult<T>[] = [];

    for (const record of all) {
      // ---- Filtering ----
      if (!q.includeExpired && this.isExpired(record)) continue;
      if (q.types && !q.types.includes(record.type)) continue;
      if (q.userId && record.userId !== q.userId) continue;
      if (q.sessionId && record.sessionId !== q.sessionId) continue;
      if (q.conversationId && record.conversationId !== q.conversationId) {
        continue;
      }
      if (q.minImportance && record.importance < q.minImportance) continue;
      if (q.tags && q.tags.length > 0) {
        const hasAll = q.tags.every((t) => record.tags.includes(t));
        if (!hasAll) continue;
      }

      // ---- Relevance scoring ----
      let relevance = 0;
      if (q.embedding && record.embedding) {
        relevance = (cosineSimilarity(q.embedding, record.embedding) + 1) / 2;
      } else if (q.text) {
        const haystack = `${record.key} ${record.tags.join(
          ' ',
        )} ${stringifyValue(record.value)}`;
        relevance = textRelevance(q.text, haystack);
      } else {
        relevance = 0.5;
      }

      if (q.text && !q.embedding && relevance === 0) continue;

      // ---- Composite score ----
      const importanceScore = record.importance / MemoryImportance.Critical;
      const recencyScore = record.accessedAt / newest;

      const score =
        relevance * this.relevanceWeight +
        importanceScore * this.importanceWeight +
        recencyScore * this.recencyWeight;

      results.push({ record: record as MemoryRecord<T>, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /** Returns all memories that carry ALL of the given tags. */
  public async findByTags(tags: string[], limit = 50): Promise<MemoryRecord[]> {
    const all = await this.store.all();
    return all
      .filter(
        (r) => !this.isExpired(r) && tags.every((t) => r.tags.includes(t)),
      )
      .slice(0, limit);
  }

  /* ------------------------------------------------------------------ */
  /* Context Retrieval                                                   */
  /* ------------------------------------------------------------------ */

  /** Assembles a rich context bundle for the reasoning pipeline. */
  public async retrieveContext(
    input: string,
    scope: {
      userId?: string;
      sessionId?: string;
      conversationId?: string;
      embedding?: number[];
      limit?: number;
    } = {},
  ): Promise<RetrievedContext> {
    const limit = scope.limit ?? 10;

    const relevantResults = await this.search({
      text: input,
      embedding: scope.embedding,
      userId: scope.userId,
      types: [
        MemoryType.LongTerm,
        MemoryType.Semantic,
        MemoryType.Session,
        MemoryType.ShortTerm,
      ],
      limit,
    });
    const relevant = relevantResults.map((r) => r.record);

    const all = await this.store.all();
    const recent = all
      .filter(
        (r) =>
          !this.isExpired(r) &&
          (r.type === MemoryType.ShortTerm || r.type === MemoryType.Working),
      )
      .sort((a, b) => b.accessedAt - a.accessedAt)
      .slice(0, limit);

    const conversation = scope.conversationId
      ? all
          .filter(
            (r) =>
              r.type === MemoryType.Conversation &&
              r.conversationId === scope.conversationId &&
              !this.isExpired(r),
          )
          .sort((a, b) => a.createdAt - b.createdAt)
      : [];

    const profile = scope.userId
      ? all.filter(
          (r) =>
            r.type === MemoryType.UserProfile &&
            r.userId === scope.userId &&
            !this.isExpired(r),
        )
      : [];

    const knowledge = this.queryKnowledgeNodes(input).slice(0, limit);

    return { relevant, recent, conversation, profile, knowledge };
  }

  /* ------------------------------------------------------------------ */
  /* Tagging & Importance                                               */
  /* ------------------------------------------------------------------ */

  /** Adds tags to an existing memory. */
  public async addTags(key: string, tags: string[]): Promise<boolean> {
    const record = await this.store.getByKey(key);
    if (!record) return false;
    record.tags = Array.from(new Set([...record.tags, ...tags]));
    record.updatedAt = Date.now();
    await this.store.put(record);
    return true;
  }

  /** Removes tags from an existing memory. */
  public async removeTags(key: string, tags: string[]): Promise<boolean> {
    const record = await this.store.getByKey(key);
    if (!record) return false;
    record.tags = record.tags.filter((t) => !tags.includes(t));
    record.updatedAt = Date.now();
    await this.store.put(record);
    return true;
  }

  /** Updates the importance score of a memory. */
  public async setImportance(
    key: string,
    importance: MemoryImportance,
  ): Promise<boolean> {
    const record = await this.store.getByKey(key);
    if (!record) return false;
    record.importance = importance;
    record.updatedAt = Date.now();
    await this.store.put(record);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Expiration & Maintenance                                           */
  /* ------------------------------------------------------------------ */

  /** Sets or updates a memory's TTL (from now). */
  public async setTtl(key: string, ttlMs: number): Promise<boolean> {
    const record = await this.store.getByKey(key);
    if (!record) return false;
    record.expiresAt = Date.now() + ttlMs;
    record.updatedAt = Date.now();
    await this.store.put(record);
    return true;
  }

  /** Returns true if a record is past its expiry timestamp. */
  public isExpired(record: MemoryRecord): boolean {
    return (
      typeof record.expiresAt === 'number' && record.expiresAt <= Date.now()
    );
  }

  /** Removes all expired records. Returns the number pruned. */
  public async pruneExpired(): Promise<number> {
    const all = await this.store.all();
    let pruned = 0;
    for (const record of all) {
      if (this.isExpired(record)) {
        await this.store.delete(record.id);
        pruned++;
      }
    }
    return pruned;
  }

  /** Evicts lowest-importance, least-recent working items over the limit. */
  private async enforceWorkingLimit(): Promise<void> {
    const all = await this.store.all();
    const working = all.filter((r) => r.type === MemoryType.Working);
    if (working.length <= this.maxWorkingItems) return;

    working.sort((a, b) => {
      if (a.importance !== b.importance) return a.importance - b.importance;
      return a.accessedAt - b.accessedAt;
    });

    const excess = working.length - this.maxWorkingItems;
    for (let i = 0; i < excess; i++) {
      await this.store.delete(working[i].id);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Knowledge Graph                                                     */
  /* ------------------------------------------------------------------ */

  /** Creates or updates a knowledge-graph node (merges properties). */
  public upsertNode(
    label: string,
    type: string,
    properties: Record<string, unknown> = {},
  ): KnowledgeNode {
    const existing = this.findNode(label, type);
    const now = Date.now();

    if (existing) {
      existing.properties = { ...existing.properties, ...properties };
      existing.updatedAt = now;
      return existing;
    }

    const node: KnowledgeNode = {
      id: generateId('node'),
      label,
      type,
      properties,
      createdAt: now,
      updatedAt: now,
    };
    this.nodes.set(node.id, node);
    return node;
  }

  /** Creates a directed, typed relationship between two nodes. */
  public addRelation(
    fromId: string,
    toId: string,
    relation: string,
    properties: Record<string, unknown> = {},
    weight?: number,
  ): KnowledgeEdge {
    if (!this.nodes.has(fromId) || !this.nodes.has(toId)) {
      throw new Error('[MemoryEngine] Both nodes must exist before linking.');
    }
    const edge: KnowledgeEdge = {
      id: generateId('edge'),
      from: fromId,
      to: toId,
      relation,
      weight,
      properties,
      createdAt: Date.now(),
    };
    this.edges.set(edge.id, edge);
    return edge;
  }

  /** Finds a node by label and type. */
  public findNode(label: string, type: string): KnowledgeNode | undefined {
    for (const node of this.nodes.values()) {
      if (node.label === label && node.type === type) return node;
    }
    return undefined;
  }

  /** Returns a node by id. */
  public getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  /** Returns edges connected to a node, filtered by relation/direction. */
  public getRelations(
    nodeId: string,
    opts: { relation?: string; direction?: 'out' | 'in' | 'both' } = {},
  ): KnowledgeEdge[] {
    const direction = opts.direction ?? 'both';
    const results: KnowledgeEdge[] = [];
    for (const edge of this.edges.values()) {
      const matchesRelation = !opts.relation || edge.relation === opts.relation;
      if (!matchesRelation) continue;

      const isOut = edge.from === nodeId;
      const isIn = edge.to === nodeId;

      if (
        (direction === 'out' && isOut) ||
        (direction === 'in' && isIn) ||
        (direction === 'both' && (isOut || isIn))
      ) {
        results.push(edge);
      }
    }
    return results;
  }

  /** Returns neighbor nodes directly connected to the given node. */
  public getNeighbors(nodeId: string, relation?: string): KnowledgeNode[] {
    const edges = this.getRelations(nodeId, { relation, direction: 'both' });
    const neighborIds = new Set<string>();
    for (const edge of edges) {
      neighborIds.add(edge.from === nodeId ? edge.to : edge.from);
    }
    return Array.from(neighborIds)
      .map((id) => this.nodes.get(id))
      .filter((n): n is KnowledgeNode => Boolean(n));
  }

  /** Naive text query across knowledge-graph node labels and types. */
  private queryKnowledgeNodes(text: string): KnowledgeNode[] {
    if (!text) return [];
    const scored: Array<{ node: KnowledgeNode; score: number }> = [];
    for (const node of this.nodes.values()) {
      const haystack = `${node.label} ${node.type}`;
      const score = textRelevance(text, haystack);
      if (score > 0) scored.push({ node, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.node);
  }

  /* ------------------------------------------------------------------ */
  /* Bulk / Admin                                                        */
  /* ------------------------------------------------------------------ */

  /** Deletes every memory belonging to a session. */
  public async clearSession(sessionId: string): Promise<number> {
    const all = await this.store.all();
    let count = 0;
    for (const record of all) {
      if (record.sessionId === sessionId) {
        await this.store.delete(record.id);
        count++;
      }
    }
    return count;
  }

  /** Deletes every memory belonging to a conversation. */
  public async clearConversation(conversationId: string): Promise<number> {
    const all = await this.store.all();
    let count = 0;
    for (const record of all) {
      if (record.conversationId === conversationId) {
        await this.store.delete(record.id);
        count++;
      }
    }
    return count;
  }

  /** Clears ALL memories and the knowledge graph. Use with caution. */
  public async clearAll(): Promise<void> {
    await this.store.clear();
    this.nodes.clear();
    this.edges.clear();
  }

  /** Returns aggregate statistics about the engine's current state. */
  public async stats(): Promise<MemoryStats> {
    const all = await this.store.all();
    const byType = {
      [MemoryType.LongTerm]: 0,
      [MemoryType.ShortTerm]: 0,
      [MemoryType.Working]: 0,
      [MemoryType.Session]: 0,
      [MemoryType.UserProfile]: 0,
      [MemoryType.Semantic]: 0,
      [MemoryType.Conversation]: 0,
    } as Record<MemoryType, number>;

    let expired = 0;
    for (const record of all) {
      byType[record.type] = (byType[record.type] ?? 0) + 1;
      if (this.isExpired(record)) expired++;
    }

    return {
      total: all.length,
      byType,
      expired,
      knowledgeNodes: this.nodes.size,
      knowledgeEdges: this.edges.size,
    };
  }
}

/** A ready-to-use shared MemoryEngine instance. Call initialize() first. */
export const memoryEngine = new MemoryEngine();

export default memoryEngine;
