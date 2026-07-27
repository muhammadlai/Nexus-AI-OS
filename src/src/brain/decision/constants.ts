/**
 * ============================================================================
 * Nexus AI OS — Decision Intelligence Constants
 * ----------------------------------------------------------------------------
 * Enums, thresholds, and scoring weights shared across the Decision layer.
 * Fully offline, dependency-free, and decoupled from sibling brain modules
 * (Memory, Planning, Emotion, Reasoning) via structural typing only.
 * ============================================================================
 */

/** High-level strategy used to arrive at a decision. */
export enum DecisionStrategy {
  RuleBased = 'rule_based',
  Heuristic = 'heuristic',
  ReasoningDriven = 'reasoning_driven',
  Hybrid = 'hybrid',
}

/** How the selected action should ultimately be carried out. */
export enum ExecutionStrategy {
  Immediate = 'immediate',
  Scheduled = 'scheduled',
  Deferred = 'deferred',
  RequiresConfirmation = 'requires_confirmation',
  RequiresClarification = 'requires_clarification',
}

/** Degree of ambiguity detected among candidate actions. */
export enum AmbiguityLevel {
  None = 'none',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}

/** Qualitative risk classification for a candidate action. */
export enum RiskLevel {
  None = 'none',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

/** Functional category of a candidate action. */
export enum ActionCategory {
  Informational = 'informational',
  Conversational = 'conversational',
  TaskExecution = 'task_execution',
  SystemControl = 'system_control',
  MemoryOperation = 'memory_operation',
  PlanningOperation = 'planning_operation',
  ClarificationRequest = 'clarification_request',
  Unknown = 'unknown',
}

/** Terminal disposition applied to a candidate during selection. */
export enum DecisionOutcome {
  Selected = 'selected',
  Rejected = 'rejected',
  Deferred = 'deferred',
  Clarify = 'clarify',
}

/** Discrete confidence banding used for reporting and thresholds. */
export enum ConfidenceTier {
  VeryHigh = 'very_high',
  High = 'high',
  Medium = 'medium',
  Low = 'low',
  VeryLow = 'very_low',
}

/** Central confidence / risk / ambiguity thresholds. */
export const DECISION_THRESHOLDS = {
  /** Minimum confidence for a decision to be actionable at all. */
  minConfidence: 0.3,
  /** Confidence at/above which auto-execution is permitted. */
  autoExecuteConfidence: 0.72,
  /** Confidence below which clarification should be requested. */
  clarificationConfidence: 0.45,
  /** Score gap below which top candidates are considered ambiguous. */
  ambiguityMargin: 0.08,
  /** Risk score at/above which confirmation is required regardless of confidence. */
  highRiskConfirmation: 0.65,
} as const;

/** Relative weights combined into each candidate's final ranking score. */
export const SCORING_WEIGHTS = {
  priority: 0.35,
  confidence: 0.4,
  riskPenalty: 0.25,
} as const;

/** Weights used internally by the confidence calculator. */
export const CONFIDENCE_WEIGHTS = {
  intentConfidence: 0.35,
  contextClarity: 0.25,
  reasoningConfidence: 0.2,
  riskPenalty: 0.1,
  historicalSuccess: 0.1,
} as const;

/** Weights used internally by the priority calculator. */
export const PRIORITY_WEIGHTS = {
  ownerPriority: 0.3,
  urgency: 0.25,
  emotionalUrgency: 0.2,
  memoryRelevance: 
