/**
 * ============================================================================
 * Nexus AI OS — Memory Utilities
 * Small internal helpers with zero external dependencies.
 * ============================================================================
 */

/** Generates a reasonably unique identifier without external dependencies. */
export function generateId(prefix = 'mem'): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${random}`;
}

/**
 * Computes cosine similarity between two equal-length numeric vectors.
 * Returns a value in [-1, 1]; returns 0 for invalid/mismatched input.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/**
 * Naive text relevance based on token overlap. Returns a score in [0, 1].
 * Serves as a dependency-free fallback when no embeddings are supplied.
 */
export function textRelevance(query: string, text: string): number {
  if (!query || !text) return 0;
  const q = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (q.length === 0) return 0;
  const haystack = text.toLowerCase();
  let hits = 0;
  for (const token of q) {
    if (haystack.includes(token)) hits++;
  }
  return hits / q.length;
}

/** Safely serializes any value to a searchable string. */
export function stringifyValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
