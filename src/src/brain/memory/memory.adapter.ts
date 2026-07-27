/**
 * ============================================================================
 * Nexus AI OS — Memory Adapter
 * ----------------------------------------------------------------------------
 * Adapts the full MemoryEngine to the minimal IMemoryEngine contract that
 * BrainCore expects (store / retrieve / search / forget). Drop this straight
 * into BrainCore.initialize({ engines: { memory: createMemoryAdapter(...) } }).
 * ============================================================================
 */

import { MemoryEngine } from './MemoryEngine';

/**
 * The minimal memory contract BrainCore consumes.
 * (Mirrors IMemoryEngine from the Brain engines module.)
 */
export interface BrainMemoryAdapter {
  store(key: string, value: unknown, tags?: string[]): Promise<void>;
  retrieve<T = unknown>(key: string): Promise<T | undefined>;
  search(query: string): Promise<unknown[]>;
  forget(key: string): Promise<void>;
}

/**
 * Creates a BrainCore-compatible memory adapter around a MemoryEngine.
 * @param engine A MemoryEngine instance (already initialized).
 */
export function createMemoryAdapter(engine: MemoryEngine): BrainMemoryAdapter {
  return {
    async store(key, value, tags = []) {
      await engine.save(key, value, { tags });
    },
    async retrieve<T = unknown>(key: string) {
      return engine.retrieve<T>(key);
    },
    async search(query: string) {
      const results = await engine.search(query);
      return results.map((r) => r.record.value);
    },
    async forget(key: string) {
      await engine.forget(key);
    },
  };
}
