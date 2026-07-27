/**
 * ============================================================================
 * Nexus AI OS — In-Memory Store
 * Default persistence backend. Swap for Redis/Postgres in production.
 * ============================================================================
 */

import { IMemoryStore, MemoryRecord } from './memory.types';

/**
 * Default high-performance in-memory store backed by Maps.
 * Maintains a secondary key→id index for O(1) key lookups.
 */
export class InMemoryStore implements IMemoryStore {
  private readonly records = new Map<string, MemoryRecord>();
  private readonly keyIndex = new Map<string, string>();

  public async get(id: string): Promise<MemoryRecord | undefined> {
    return this.records.get(id);
  }

  public async getByKey(key: string): Promise<MemoryRecord | undefined> {
    const id = this.keyIndex.get(key);
    return id ? this.records.get(id) : undefined;
  }

  public async put(record: MemoryRecord): Promise<void> {
    this.records.set(record.id, record);
    this.keyIndex.set(record.key, record.id);
  }

  public async delete(id: string): Promise<boolean> {
    const record = this.records.get(id);
    if (!record) return false;
    this.keyIndex.delete(record.key);
    return this.records.delete(id);
  }

  public async deleteByKey(key: string): Promise<boolean> {
    const id = this.keyIndex.get(key);
    if (!id) return false;
    this.keyIndex.delete(key);
    return this.records.delete(id);
  }

  public async all(): Promise<MemoryRecord[]> {
    return Array.from(this.records.values());
  }

  public async clear(): Promise<void> {
    this.records.clear();
    this.keyIndex.clear();
  }
}
