/**
 * Planning Engine constants, defaults and heuristic knowledge bases.
 */

import {
  ExecutionMode,
  PlanPriority,
  PlanningStrategy,
  RetryPolicy,
  RiskLevel,
  type RetryPolicyConfig,
} from "./types.js";

export const PLANNING_ENGINE_NAME = "NexusPlanningEngine";
export const PLANNING_ENGINE_VERSION = "1.0.0";
export const PLAN_SERIALIZATION_VERSION = 1;

export const PLANNING_LIMITS = Object.freeze({
  maximumTasksPerPlan: 500,
  maximumGoalDepth: 8,
  maximumSubGoals: 50,
  maximumDescriptionLength: 20_000,
  maximumRetryDelayMs: 30_000,
  maximumHistoryEntries: 500,
  defaultParallelismLimit: 8,
});

export const PRIORITY_WEIGHTS: Readonly<
  Record<PlanPriority, number>
> = Object.freeze({
  [PlanPriority.CRITICAL]: 100,
  [PlanPriority.HIGH]: 75,
  [PlanPriority.MEDIUM]: 50,
  [PlanPriority.LOW]: 25,
});

export const RISK_SCORES: Readonly<
  Record<RiskLevel, number>
> = Object.freeze({
  [RiskLevel.LOW]: 0.15,
  [RiskLevel.MODERATE]: 0.4,
  [RiskLevel.HIGH]: 0.7,
  [RiskLevel.CRITICAL]: 0.95,
});

export const DEFAULT_RETRY_POLICY: RetryPolicyConfig =
  Object.freeze({
    mode: RetryPolicy.LIMITED,
    maxAttempts: 3,
    delayMs: 250,
    backoffMultiplier: 2,
  });

export const RETRY_ATTEMPT_CAPS: Readonly<
  Record<RetryPolicy, number>
> = Object.freeze({
  [RetryPolicy.NEVER]: 1,
  [RetryPolicy.ONCE]: 2,
  [RetryPolicy.LIMITED]: 10,
  [RetryPolicy.INFINITE]: Number.MAX_SAFE_INTEGER,
});

export const DEFAULT_PLANNER_OPTIONS = Object.freeze({
  strategy: PlanningStrategy.BALANCED,
  executionMode: ExecutionMode.HYBRID,
  priority: PlanPriority.MEDIUM,
  maximumDepth: 4,
  maximumTasks: PLANNING_LIMITS.maximumTasksPerPlan,
  parallelismLimit:
    PLANNING_LIMITS.defaultParallelismLimit,
});

export interface ActionKnowledge {
  readonly action: string;
  readonly keywords: readonly string[];
  readonly baseDurationMs: number;
  readonly baseCost: number;
  readonly capabilities: readonly string[];
}

/**
 * Offline verb/action knowledge used for task decomposition.
 */
export const ACTION_KNOWLEDGE: readonly ActionKnowledge[] =
  Object.freeze([
    {
      action: "search_information",
      keywords: ["search", "find", "look up", "research"],
      baseDurationMs: 4_000,
      baseCost: 0.02,
      capabilities: ["search"],
    },
    {
      action: "generate_code",
      keywords: ["write code", "generate code", "implement", "create function", "build app"],
      baseDurationMs: 15_000,
      baseCost: 0.12,
      capabilities: ["coding", "generation"],
    },
    {
      action: "review_code",
      keywords: ["review", "refactor", "debug", "fix", "test"],
      baseDurationMs: 9_000,
      baseCost: 0.08,
      capabilities: ["coding", "reasoning"],
    },
    {
      action: "create_file",
      keywords: ["create file", "new file", "save file", "folder", "document"],
      baseDurationMs: 2_500,
      baseCost: 0.01,
      capabilities: ["files"],
    },
    {
      action: "send_email",
      keywords: ["send email", "email", "mail", "message to"],
      baseDurationMs: 3_500,
      baseCost: 0.03,
      capabilities: ["email"],
    },
    {
      action: "schedule_event",
      keywords: ["schedule", "calendar", "meeting", "reminder", "appointment"],
      baseDurationMs: 3_000,
      baseCost: 0.02,
      capabilities: ["calendar"],
    },
    {
      action: "analyze_content",
      keywords: ["analyze", "summarize", "extract", "compare", "evaluate"],
      baseDurationMs: 8_000,
      baseCost: 0.06,
      capabilities: ["reasoning", "documents"],
    },
    {
      action: "translate_text",
      keywords: ["translate", "translation", "convert language"],
      baseDurationMs: 4_500,
      baseCost: 0.04,
      capabilities: ["translation"],
    },
    {
      action: "calculate",
      keywords: ["calculate", "compute", "solve", "math"],
      baseDurationMs: 2_000,
      baseCost: 0.01,
      capabilities: ["math"],
    },
    {
      action: "navigate",
      keywords: ["navigate", "open website", "go to", "directions"],
      baseDurationMs: 3_000,
      baseCost: 0.02,
      capabilities: ["navigation", "browser"],
    },
    {
      action: "fetch_data",
      keywords: ["fetch", "download", "retrieve", "load data", "api"],
      baseDurationMs: 5_000,
      baseCost: 0.03,
      capabilities: ["network"],
    },
    {
      action: "notify_user",
      keywords: ["notify", "remind", "alert", "tell the user"],
      baseDurationMs: 1_000,
      baseCost: 0.005,
      capabilities: ["notification"],
    },
    {
      action: "deploy",
      keywords: ["deploy", "publish", "release", "launch"],
      baseDurationMs: 20_000,
      baseCost: 0.2,
      capabilities: ["deployment"],
    },
  ]);

export const DEFAULT_ACTION = "execute_goal";

export const HIGH_RISK_KEYWORDS = Object.freeze([
  "delete",
  "remove",
  "overwrite",
  "deploy",
  "publish",
  "payment",
  "send money",
  "format",
  "purge",
  "drop table",
]);

export const URGENCY_KEYWORDS = Object.freeze([
  "urgent",
  "immediately",
  "asap",
  "critical",
  "now",
  "emergency",
]);

export const SEQUENTIAL_CONNECTORS = Object.freeze([
  "then",
  "after that",
  "next",
  "finally",
  "once",
]);
