/**
 * ============================================================================
 * Nexus AI OS — Intent Engine Types
 * ----------------------------------------------------------------------------
 * Complete type surface for intents, entities, predictions, analysis,
 * context, history, confidence, and metadata.
 * ============================================================================
 */

import { IntentName } from './constants';

/**
 * A confidence measurement with optional per-signal breakdown for
 * explainability and future LLM fusion.
 */
export interface IntentConfidence {
  /** Final blended confidence in [0, 1]. */
  score: number;
  /** Contribution from keyword matching. */
  keyword?: number;
  /** Contribution from regex pattern matching. */
  pattern?: number;
  /** Contribution from contextual signals. */
  context?: number;
  /** Contribution from an external model (LLM), when integrated. */
  model?: number;
}

/**
 * Arbitrary, forward-compatible metadata attached to an intent or result.
 */
export interface IntentMetadata {
  /** Source that produced the classification (e.g. 'rules', 'llm'). */
  source?: string;
  /** Engine/model version used. */
  version?: string;
  /** Free-form tags for filtering/telemetry. */
  tags?: string[];
  /** Any additional structured data. */
  [key: string]: unknown;
}

/**
 * A registered intent definition (rule-based baseline + registry entry).
 */
export interface Intent {
  /** Canonical intent identifier. */
  name: string;
  /** Human-readable description. */
  description?: string;
  /** Keywords indicating this intent. */
  keywords: string[];
  /** Regex patterns indicating this intent. */
  patterns: RegExp[];
  /** Base weight applied on match. */
  weight: number;
  /** Registry priority (higher wins on ambiguity). */
  priority: number;
  /** Whether this intent is enabled. */
  enabled: boolean;
  /** Definition version for auditing. */
  version: number;
  /** Optional metadata. */
  metadata?: IntentMetadata;
}

/** A single extracted entity with position span and confidence. */
export interface IntentEntity {
  /** Entity category (e.g. 'email', 'city', 'programming_language'). */
  type: string;
  /** Raw matched value. */
  value: string;
  /** Normalized/canonical value where applicable. */
  normalized?: string;
  /** Start index within the source text. */
  start: number;
  /** End index (exclusive) within the source text. */
  end: number;
  /** Extraction confidence in [0, 1]. */
  confidence: number;
  /** Optional metadata (e.g. resolver hints). */
  metadata?: Record<string, unknown>;
}

/** A single ranked intent prediction. */
export interface IntentPrediction {
  /** Predicted intent name. */
  name: string;
  /** Confidence breakdown. */
  confidence: IntentConfidence;
  /** Registry priority of the matched intent. */
  priority: number;
}

/**
 * The complete, structured output of an intent analysis pass.
 * Superset of BrainCore's IntentResult ({ name, confidence, entities }).
 */
export interface IntentAnalysis {
  /** Top predicted intent name. */
  name: string;
  /** Top intent confidence score in [0, 1] (BrainCore compatibility). */
  confidence: number;
  /** Extracted entities keyed by type (BrainCore compatibility). */
  entities: Record<string, unknown>;
  /** Detailed extracted entities (rich form). */
  entityList: IntentEntity[];
  /** Ranked predictions (multi-intent). */
  predictions: IntentPrediction[];
  /** Secondary intents above the retention threshold. */
  secondary: IntentPrediction[];
  /** Whether the result is considered ambiguous. */
  ambiguous: boolean;
  /** The normalized input processed. */
  normalizedInput: string;
  /** Result metadata. */
  metadata: IntentMetadata;
  /** Epoch ms when produced. */
  timestamp: number;
}

/** A previously detected intent retained for context. */
export interface IntentHistory {
  intent: string;
  confidence: number;
  input: string;
  timestamp: number;
}

/**
 * Contextual signals used to bias classification. Sourced from BrainCore's
 * live context, memory, and application state.
 */
export interface IntentContext {
  /** Prior conversation turns (most recent last). */
  conversationHistory?: Array<{ role: string; content: string }>;
  /** Relevant memory snippets. */
  memoryContext?: string[];
  /** The most recently detected intent. */
  previousIntent?: string;
  /** Recent intent history window. */
  intentHistory?: IntentHistory[];
  /** Arbitrary user-state signals (mood, preferences, etc.). */
  userState?: Record<string, unknown>;
  /** The currently active task id/name, if any. */
  activeTask?: string;
  /** The currently focused application. */
  currentApplication?: string;
  /** The currently focused page/route. */
  currentPage?: string;
  /** Any additional contextual variables. */
  variables?: Record<string, unknown>;
}

/** The learning signal fed back to the engine after an interaction. */
export interface IntentFeedback {
  /** The input that was classified. */
  input: string;
  /** The intent the engine predicted. */
  predicted: string;
  /** The correct intent (ground truth). */
  actual: string;
  /** Optional reward signal in [-1, 1]. */
  reward?: number;
  /** Epoch ms of the feedback. */
  timestamp?: number;
}

/** A custom entity definition registered at runtime. */
export interface CustomEntityDefinition {
  type: string;
  pattern: RegExp;
  /** Optional normalizer applied to matched values. */
  normalize?: (value: string) => string;
  confidence?: number;
}

/** Options for constructing/initializing the engine. */
export interface IntentEngineOptions {
  /** Override the minimum confidence threshold. */
  minConfidence?: number;
  /** Maximum predictions retained per result. */
  maxPredictions?: number;
  /** Whether learning/feedback adaptation is enabled. */
  learningEnabled?: boolean;
  /** Engine version string reported in metadata. */
  version?: string;
}

/** Re-export for convenience so consumers can import from one place. */
export { IntentName };
