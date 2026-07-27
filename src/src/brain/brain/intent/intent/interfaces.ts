/**
 * ============================================================================
 * Nexus AI OS — Intent Engine Interfaces (DI Contracts)
 * ----------------------------------------------------------------------------
 * Abstractions that the engine depends on. Concrete implementations are
 * injected, keeping the architecture decoupled and LLM-ready.
 * ============================================================================
 */

import {
  Intent,
  IntentAnalysis,
  IntentContext,
  IntentEntity,
  IntentFeedback,
  IntentPrediction,
  CustomEntityDefinition,
} from './types';

/** Contract for classifying raw text into ranked intent predictions. */
export interface IIntentClassifier {
  /**
   * Classifies input against all enabled intents.
   * @param input Normalized user text.
   * @param intents The registered intents to match against.
   * @param context Optional contextual signals for biasing.
   */
  classify(
    input: string,
    intents: Intent[],
    context?: IntentContext,
  ): IntentPrediction[];
}

/** Contract for extracting structured entities from text. */
export interface IEntityExtractor {
  /** Extracts all entities from the input text. */
  extract(input: string): IntentEntity[];
  /** Registers a custom entity definition. */
  registerEntity(def: CustomEntityDefinition): void;
  /** Removes a custom entity by type. */
  removeEntity(type: string): boolean;
}

/** Contract for context-based confidence adjustment. */
export interface IContextAnalyzer {
  /**
   * Produces a context bias map: intent name -> additive score delta.
   * @param context The current context signals.
   * @param candidates Candidate predictions to consider.
   */
  analyze(
    context: IntentContext | undefined,
    candidates: IntentPrediction[],
  ): Record<string, number>;
}

/** Contract for dynamic intent registration and lookup. */
export interface IIntentRegistry {
  register(intent: Partial<Intent> & { name: string }): Intent;
  remove(name: string): boolean;
  get(name: string): Intent | undefined;
  list(): Intent[];
  listEnabled(): Intent[];
  has(name: string): boolean;
  setEnabled(name: string, enabled: boolean): boolean;
}

/**
 * Contract for the top-level Intent Engine.
 * `detect()` is BrainCore's IIntentEngine entry point.
 */
export interface IIntentEngine {
  initialize(): Promise<void>;
  detect(input: string, context?: IntentContext): Promise<IntentAnalysis>;
  classify(input: string, context?: IntentContext): IntentPrediction[];
  analyze(input: string, context?: IntentContext): Promise<IntentAnalysis>;
  rank(predictions: IntentPrediction[]): IntentPrediction[];
  predict(input: string, context?: IntentContext): Promise<IntentPrediction>;
  merge(...analyses: IntentAnalysis[]): IntentAnalysis;
  validate(analysis: IntentAnalysis): boolean;
  learn(feedback: IntentFeedback): void;
  registerIntent(intent: Partial<Intent> & { name: string }): Intent;
  removeIntent(name: string): boolean;
  listIntents(): Intent[];
}
