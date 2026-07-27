/**
 * ============================================================================
 * Nexus AI OS — Engine Interfaces (Dependency Contracts)
 * ----------------------------------------------------------------------------
 * BrainCore depends only on these abstractions. Concrete engines are
 * registered at runtime. This keeps the Brain decoupled, testable, and
 * ready for future enterprise integration.
 * ============================================================================
 */

import {
  BrainContext,
  Conversation,
  BrainMessage,
  EmotionResult,
  IntentResult,
  ReasoningResult,
  Decision,
  ExecutionPlan,
  AIAgent,
} from './types';

/** Long-term / short-term memory persistence engine. */
export interface IMemoryEngine {
  store(key: string, value: unknown, tags?: string[]): Promise<void> | void;
  retrieve<T = unknown>(key: string): Promise<T | undefined> | T | undefined;
  search?(query: string): Promise<unknown[]> | unknown[];
  forget?(key: string): Promise<void> | void;
}

/** Conversation management engine. */
export interface IConversationEngine {
  create(title?: string): Promise<Conversation> | Conversation;
  append(conversationId: string, message: BrainMessage): Promise<void> | void;
  get(
    conversationId: string,
  ): Promise<Conversation | undefined> | Conversation | undefined;
}

/** Emotion / sentiment analysis engine. */
export interface IEmotionEngine {
  analyze(
    input: string,
    context?: BrainContext,
  ): Promise<EmotionResult> | EmotionResult;
}

/** Intent recognition engine. */
export interface IIntentEngine {
  detect(
    input: string,
    context?: BrainContext,
  ): Promise<IntentResult> | IntentResult;
}

/** High-level reasoning / cognition engine. */
export interface IReasoningEngine {
  reason(
    input: string,
    context?: BrainContext,
  ): Promise<ReasoningResult> | ReasoningResult;
}

/** Decision-making engine. */
export interface IDecisionEngine {
  decide(
    reasoning: ReasoningResult,
    context?: BrainContext,
  ): Promise<Decision> | Decision;
}

/** Action / plan generation engine. */
export interface IActionPlanner {
  plan(
    goal: string,
    context?: BrainContext,
  ): Promise<ExecutionPlan> | ExecutionPlan;
}

/** Task / plan execution engine. */
export interface ITaskExecutor {
  execute(
    plan: ExecutionPlan,
    context?: BrainContext,
  ): Promise<unknown> | unknown;
  cancel?(planId: string): Promise<void> | void;
}

/* ==========================================================================
 * Aggregate configuration
 * ========================================================================== */

/**
 * The full set of engines that can be injected into BrainCore.
 * All are optional so the Brain can operate in degraded/partial modes.
 */
export interface BrainEngines {
  memory?: IMemoryEngine;
  conversation?: IConversationEngine;
  emotion?: IEmotionEngine;
  intent?: IIntentEngine;
  reasoning?: IReasoningEngine;
  decision?: IDecisionEngine;
  planner?: IActionPlanner;
  executor?: ITaskExecutor;
}

/** Optional configuration for BrainCore initialization. */
export interface BrainConfig {
  engines?: BrainEngines;
  agents?: AIAgent[];
  /** If true, the Brain auto-executes plans produced by decisions. */
  autoExecute?: boolean;
  /** Maximum number of messages retained per conversation in-memory. */
  maxConversationHistory?: number;
}
