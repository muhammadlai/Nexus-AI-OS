/** Generates a namespaced unique id. */
export function rid(prefix = 'rsn'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Clamps a number into [min, max]. */
export function clamp(n: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, n));
}

/** Averages an array of numbers (0 if empty). */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Splits input into meaningful clauses for step-wise reasoning. */
export function toClauses(input: string): string[] {
  return input
    .split(/[.;\n?!]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
