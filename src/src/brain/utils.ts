/**
 * ============================================================================
 * Nexus AI OS — Brain Utilities
 * Small internal helpers with zero external dependencies.
 * ============================================================================
 */

/** Generates a reasonably unique identifier without external dependencies. */
export function generateId(prefix = 'id'): string {
  const random = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${random}`;
}

/** Resolves a value that may be synchronous or a Promise. */
export async function resolveMaybe<T>(value: Promise<T> | T): Promise<T> {
  return value instanceof Promise ? await value : value;
}
