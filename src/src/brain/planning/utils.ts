/**
 * Pure utilities: ids, hashing, cloning, graph/time/priority/cost/risk
 * helpers and text heuristics used by the Planning Engine.
 */

import {
  PRIORITY_WEIGHTS,
  RISK_SCORES,
  SEQUENTIAL_CONNECTORS,
} from "./constants.js";

import {
  PlanPriority,
  RiskLevel,
  type DeepWriteable,
} from "./types.js";

export function createUuid(prefix: string): string {
  const cryptoProvider = (
    globalThis as typeof globalThis & {
      crypto?: { randomUUID?: () => string };
    }
  ).crypto;

  if (typeof cryptoProvider?.randomUUID === "function") {
    return `${prefix}_${cryptoProvider.randomUUID()}`;
  }

  return [
    prefix,
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
    Math.random().toString(36).slice(2, 10),
  ].join("_");
}

export function hashString(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash =
      (hash +
        (hash << 1) +
        (hash << 4) +
        (hash << 7) +
        (hash << 8) +
        (hash << 24)) |
      0;
  }

  return (hash >>> 0).toString(36);
}

export function deepClone<T>(value: T): T {
  const global = globalThis as {
    structuredClone?: (input: T) => T;
  };

  if (typeof global.structuredClone === "function") {
    return global.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const output: Record<string, unknown> = {
    ...target,
  };

  for (const [key, value] of Object.entries(source)) {
    const current = output[key];

    if (isPlainObject(current) && isPlainObject(value)) {
      output[key] = deepMerge(
        current as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else if (value !== undefined) {
      output[key] = deepClone(value);
    }
  }

  return output as T;
}

export function clamp(
  value: number,
  minimum = 0,
  maximum = 1,
): number {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

export function assertNonEmpty(
  value: string,
  fieldName: string,
): string {
  const normalized = value?.trim();

  if (!normalized) {
    throw new TypeError(`${fieldName} cannot be empty.`);
  }

  return normalized;
}

export function assertNotAborted(
  signal?: AbortSignal,
): void {
  if (signal?.aborted) {
    throw new Error(
      String(signal.reason ?? "Planning operation aborted."),
    );
  }
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return "0ms";
  }

  if (ms < 1_000) {
    return `${Math.round(ms)}ms`;
  }

  if (ms < 60_000) {
    return `${(ms / 1_000).toFixed(1)}s`;
  }

  if (ms < 3_600_000) {
    return `${(ms / 60_000).toFixed(1)}m`;
  }

  return `${(ms / 3_600_000).toFixed(2)}h`;
}

export function abortableSleep(
  ms: number,
  signal?: AbortSignal,
): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const onAbort = (): void => {
      cleanup();
      reject(
        new Error(
          String(signal?.reason ?? "Sleep aborted."),
        ),
      );
    };

    const cleanup = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };

    signal?.addEventListener("abort", onAbort, {
      once: true,
    });
  });
}

/**
 * Small promise deferred used for pause/resume coordination.
 */
export class Deferred<T = void> {
  public readonly promise: Promise<T>;
  private resolveFn!: (value: T) => void;
  private rejectFn!: (reason?: unknown) => void;
  private settled = false;

  public constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });
  }

  public resolve(value: T): void {
    if (!this.settled) {
      this.settled = true;
      this.resolveFn(value);
    }
  }

  public reject(reason?: unknown): void {
    if (!this.settled) {
      this.settled = true;
      this.rejectFn(reason);
    }
  }

  public get isSettled(): boolean {
    return this.settled;
  }
}

export function priorityWeight(
  priority: PlanPriority,
): number {
  return PRIORITY_WEIGHTS[priority] ?? 0;
}

export function compareByPriorityDesc(
  left: PlanPriority,
  right: PlanPriority,
): number {
  return priorityWeight(right) - priorityWeight(left);
}

export function riskScoreOf(level: RiskLevel): number {
  return RISK_SCORES[level] ?? 0;
}

export function riskLevelOf(score: number): RiskLevel {
  if (score >= 0.85) {
    return RiskLevel.CRITICAL;
  }

  if (score >= 0.6) {
    return RiskLevel.HIGH;
  }

  if (score >= 0.3) {
    return RiskLevel.MODERATE;
  }

  return RiskLevel.LOW;
}

export function aggregateRiskScore(
  scores: readonly number[],
): number {
  if (scores.length === 0) {
    return 0;
  }

  const maximum = Math.max(...scores);
  const average =
    scores.reduce((sum, value) => sum + value, 0) /
    scores.length;

  return clamp(maximum * 0.7 + average * 0.3);
}

export function sumResources(
  items: readonly Readonly<Record<string, number>>[],
): Record<string, number> {
  const output: Record<string, number> = {};

  for (const item of items) {
    for (const [key, value] of Object.entries(item)) {
      if (Number.isFinite(value)) {
        output[key] = (output[key] ?? 0) + value;
      }
    }
  }

  return output;
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/[^\p{L}\p{N}+#._-]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

export interface Clause {
  readonly text: string;
  readonly connector: "then" | "and";
}

/**
 * Splits a goal description into ordered work clauses.
 */
export function splitClauses(input: string): readonly Clause[] {
  const pattern =
    /\b(and then|then|after that|next|finally|once done)\b|;|\n/gi;

  const clauses: Clause[] = [];
  let lastIndex = 0;
  let previousConnector: "then" | "and" = "and";
  let match: RegExpExecArray | null;

  const push = (raw: string): void => {
    const text = raw.trim();

    if (text) {
      clauses.push({
        text,
        connector: previousConnector,
      });
    }
  };

  while ((match = pattern.exec(input)) !== null) {
    push(input.slice(lastIndex, match.index));

    const delimiter = normalizeText(match[0] ?? "");

    previousConnector =
      delimiter === "and" &&
      !SEQUENTIAL_CONNECTORS.includes(delimiter)
        ? "and"
        : "then";

    lastIndex = match.index + match[0].length;
  }

  push(input.slice(lastIndex));

  return clauses.length > 0
    ? clauses
    : [{ text: input.trim(), connector: "and" }];
}

export function toMutable<T>(value: T): DeepWriteable<T> {
  return deepClone(value) as DeepWriteable<T>;
}

export async function runInChunks<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const size = Math.max(1, Math.floor(limit));
  let cursor = 0;

  while (cursor < items.length) {
    const chunk = items.slice(cursor, cursor + size);
    cursor += size;

    await Promise.all(chunk.map((item) => worker(item)));
  }
}
