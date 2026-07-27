/**
 * ============================================================================
 * Nexus AI OS — Emotion Engine Interfaces (DI Contracts)
 * ----------------------------------------------------------------------------
 * Abstractions injected across the subsystem, enabling clean architecture,
 * testability, and future model-backed implementations.
 * ============================================================================
 */

import { ReplyTone } from './constants';
import {
  EmotionResult,
  EmotionScore,
  SentimentResult,
  MoodState,
  MoodTrend,
  EmotionTimeline,
  EmotionTimelineEntry,
  EmotionContextData,
  EmpathyReply,
  EmotionDefinition,
} from './types';

/** Contract for sentiment analysis. */
export interface ISentimentAnalyzer {
  analyze(text: string): SentimentResult;
}

/** Contract for discrete emotion classification. */
export interface IEmotionClassifier {
  classify(text: string): EmotionScore[];
}

/** Contract for full emotion analysis (classification + sentiment + scoring). */
export interface IEmotionAnalyzer {
  analyze(text: string, biases?: Record<string, number>): EmotionResult;
}

/** Contract for long-term mood tracking. */
export interface IMoodTracker {
  track(entry: EmotionTimelineEntry): void;
  getCurrentMood(): MoodState;
  getAverageMood(): number;
  getHistory(): EmotionTimeline;
  getRecent(count?: number): EmotionTimeline;
  getTrend(): MoodTrend;
  reset(): void;
}

/** Contract for emotional memory persistence. */
export interface IEmotionMemory {
  remember(entry: EmotionTimelineEntry): void;
  recall(count?: number): EmotionTimeline;
  getTimeline(): EmotionTimeline;
  clear(): void;
}

/** Contract for context-based emotion biasing. */
export interface IEmotionContext {
  analyze(
    context: EmotionContextData | undefined,
    scores: EmotionScore[],
  ): Record<string, number>;
}

/** Contract for empathetic reply generation. */
export interface IEmpathyEngine {
  generate(result: EmotionResult, tone?: ReplyTone): EmpathyReply;
  supportiveReply(result: EmotionResult): EmpathyReply;
  professionalReply(result: EmotionResult): EmpathyReply;
  friendlyReply(result: EmotionResult): EmpathyReply;
  motivationalReply(result: EmotionResult): EmpathyReply;
  empatheticReply(result: EmotionResult): EmpathyReply;
}

/** Contract for dynamic emotion registration. */
export interface IEmotionRegistry {
  register(def: Partial<EmotionDefinition> & { type: string }): EmotionDefinition;
  remove(type: string): boolean;
  get(type: string): EmotionDefinition | undefined;
  list(): EmotionDefinition[];
  listEnabled(): EmotionDefinition[];
  has(type: string): boolean;
}

/** Contract for the top-level emotion engine (BrainCore-compatible). */
export interface IEmotionEngine {
  initialize(): Promise<void>;
  analyze(input: string, context?: EmotionContextData): Promise<EmotionResult>;
  detect(input: string, context?: EmotionContextData): Promise<EmotionResult>;
  getMood(): MoodState;
  getEmotionHistory(): EmotionTimeline;
  generateEmpathy(result: EmotionResult, tone?: ReplyTone): EmpathyReply;
  registerEmotion(def: Partial<EmotionDefinition> & { type: string }): void;
  reset(): void;
}
