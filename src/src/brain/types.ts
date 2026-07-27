/**
 * ============================================================================
 * Nexus AI OS — Brain Domain Types
 * Core domain interfaces, engine result contracts, config & events.
 * ============================================================================
 */

import { BrainState, TaskPriority, TaskStatus } from './enums';

/* ==========================================================================
 * Core Domain Interfaces
 * ========================================================================== */

/** A single message exchanged within a conversation. */
export interface BrainMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  timestamp: number;
  agentId?: string;
  metadata?: Record<string, unknown>;
}

/** A live conversation session tracked by the Brain. */
export interface Conversation {
  id: string;
  title?: string;
  messages: BrainMessage[];
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

/** Represents an AI agent that the Brain can delegate work to. */
export interface AIAgent {
  id: string;
  name: string;
  role: string;
  description?: string;
  capabilities: string[];
  active: boolean;
  metadata?: Record<string, unknown>;
}

/** A single actionable step within an execution plan. */
export interface PlanStep {
  id: string;
  description: string;
  action: string;
  args?: Record<string, unknown>;
  dependsOn?: string[];
  status: TaskStatus;
  result?: unknown;
}

/** A structured execution plan produced by the planning phase. */
export interface ExecutionPlan {
  id: string;
  goal: string;
  steps: PlanStep[];
  createdAt: number;
  priority: TaskPriority;
  metadata?: Record<string, unknown>;
}

/** A task the Brain is actively working on. */
export interface Task {
  id: string;
  goal: string;
  plan?: ExecutionPlan;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: number;
  updatedAt: number;
  result?: unknown;
  error?: string;
}

/** The rolling cognitive context maintained across the pipeline. */
export interface BrainContext {
  conversationId?: string;
  taskId?: string;
  activeAgentId?: string;
  intent?: IntentResult;
  emotion?: EmotionResult;
  variables: Record<string, unknown>;
}

/* ==========================================================================
 * Engine Result Contracts
 * ========================================================================== */

export interface IntentResult {
  name: string;
  confidence: number;
  entities?: Record<string, unknown>;
}

export interface EmotionResult {
  primary: string;
  intensity: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  scores?: Record<string, number>;
}

export interface ReasoningResult {
  answer: string;
  rationale?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface Decision {
  action: string;
  shouldPlan: boolean;
  shouldExecute: boolean;
  rationale?: string;
  metadata?: Record<string, unknown>;
}

/* ==========================================================================
 * Configuration & Events
 * ========================================================================== */

/** Result returned from processing a single user message. */
export interface ProcessResult {
  conversationId: string;
  response: string;
  intent?: IntentResult;
  emotion?: EmotionResult;
  reasoning?: ReasoningResult;
  decision?: Decision;
  plan?: ExecutionPlan;
  taskResult?: unknown;
  state: BrainState;
}

/** Events the Brain can emit for observers/telemetry. */
export type BrainEventType =
  | 'stateChanged'
  | 'messageReceived'
  | 'messageProcessed'
  | 'planGenerated'
  | 'taskStarted'
  | 'taskCompleted'
  | 'error';

export interface BrainEvent {
  type: BrainEventType;
  timestamp: number;
  payload?: unknown;
}

/** Listener signature for Brain events. */
export type BrainEventListener = (event: BrainEvent) => void;
