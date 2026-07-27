/**
 * ============================================================================
 * Nexus AI OS — Intent Engine Utilities
 * ----------------------------------------------------------------------------
 * Pure, dependency-free helpers: normalization, tokenization, similarity,
 * confidence math, keyword matching, and regex utilities.
 * ============================================================================
 */

import { INTENT_LIMITS } from './constants';

/** A lightweight set of English stop-words used for token weighting. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'to', 'of', 'in', 'on', 'for', 'and',
  'or', 'i', 'you', 'me', 'my', 'your', 'it', 'this', 'that', 'please', 'can',
  'could', 'would', 'do', 'does', 'did', 'be', 'with', 'at', 'by',
]);

/** Generates a namespaced unique id. */
export function iid(prefix = 'int'): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rnd}`;
}

/** Clamps a number into [min, max]. */
export function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Normalizes input text: trims, collapses whitespace, lowercases, and
 * caps length to the configured maximum.
 */
export function normalize(text: string): string {
  const trimmed = text.slice(0, INTENT_LIMITS.maxInputLength);
  return trimmed.replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Tokenizes text into word tokens (letters, digits, apostrophes). */
export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

/** Returns meaningful (non-stop-word) tokens. */
export function contentTokens(text: string): string[] {
  return tokenize(text).filter((t) => !STOP_WORDS.has(t));
}

/**
 * Counts how many keywords/phrases appear in the input. Phrases (with
 * spaces) are matched as substrings; single words as token matches.
 */
export function countKeywordHits(input: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  const tokens = new Set(tokenize(input));
  let hits = 0;
  for (const kw of keywords) {
    const key = kw.toLowerCase();
    if (key.includes(' ')) {
      if (input.includes(key)) hits++;
    } else if (tokens.has(key)) {
      hits++;
    }
  }
  return hits;
}

/** Counts how many regex patterns match the input. */
export function countPatternHits(input: string, patterns: RegExp[]): number {
  let hits = 0;
  for (const p of patterns) {
    // Use a fresh regex to avoid lastIndex issues on global patterns.
    const re = new RegExp(p.source, p.flags.replace('g', ''));
    if (re.test(input)) hits++;
  }
  return hits;
}

/**
 * Jaccard similarity between two token sets, in [0, 1].
 * Useful for fuzzy matching and future example-based routing.
 */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(contentTokens(a));
  const setB = new Set(contentTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Levenshtein edit distance between two strings. Used for tolerant
 * keyword matching (typos) when needed.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

/** String similarity in [0, 1] derived from edit distance. */
export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

/**
 * Blends multiple weighted confidence signals into a final score in [0, 1].
 * Signals with undefined values are ignored.
 */
export function blendConfidence(
  signals: Array<{ value?: number; weight: number }>,
): number {
  let sum = 0;
  let totalWeight = 0;
  for (const s of signals) {
    if (typeof s.value === 'number') {
      sum += clamp(s.value) * s.weight;
      totalWeight += s.weight;
    }
  }
  return totalWeight === 0 ? 0 : clamp(sum / totalWeight);
}

/**
 * Applies a smooth diminishing-returns curve so that more matches raise
 * confidence but never exceed 1. Great for keyword/pattern hit counts.
 */
export function saturate(hits: number, k = 1.5): number {
  if (hits <= 0) return 0;
  return clamp(1 - Math.exp(-hits / k));
}

/** Builds a fresh, side-effect-free copy of a regex. */
export function cloneRegex(re: RegExp, dropGlobal = false): RegExp {
  const flags = dropGlobal ? re.flags.replace('g', '') : re.flags;
  return new RegExp(re.source, flags);
}
