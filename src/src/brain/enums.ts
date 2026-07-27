/**
 * ============================================================================
 * Nexus AI OS — Brain Enums
 * All finite state and status definitions used across the Brain.
 * ============================================================================
 */

/**
 * The finite set of operational states the Brain can occupy.
 * State transitions are driven internally by the cognitive pipeline.
 */
export enum BrainState {
  Idle = 'idle',
  Listening = 'listening',
  Thinking = 'thinking',
  Reasoning = 'reasoning',
  Planning = 'planning',
  Executing = 'executing',
  Speaking = 'speaking',
  Completed = 'completed',
  Error = 'error',
}

/**
 * Lifecycle status of the BrainCore instance itself.
 */
export enum BrainLifecycle {
  Uninitialized = 'uninitialized',
  Initializing = 'initializing',
  Ready = 'ready',
  Stopped = 'stopped',
  Destroyed = 'destroyed',
}

/**
 * Priority levels used when planning and executing tasks.
 */
export enum TaskPriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Critical = 'critical',
}

/**
 * Execution status for tasks and plan steps.
 */
export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}
