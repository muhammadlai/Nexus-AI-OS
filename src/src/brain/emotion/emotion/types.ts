/**
 * ============================================================================
 * Nexus AI OS — Emotion Engine Types
 * ----------------------------------------------------------------------------
 * Complete type surface: results, scores, mood, timelines, context, empathy.
 * ============================================================================
 */

import { EmotionType, Sentiment, SentimentLabel, ReplyTone } from './constants';

/** A single emotion with its normalized score in [0, 1]. */
export interface EmotionScore {
  /** Emotion identifier (built-in or custom). */
  emotion: string;
  /** Normalized score in [0, 1]. */
  score: number;
}

/** Structured sentiment analysis output. */
export interface SentimentResult {
  /** Extended label (may be 'mixed'). */
  label: SentimentLabel;
  /** Three-valued sentiment (BrainCore-compatible). */
  sentiment: Sentiment;
  /** Signed polarity in [-1, 1]. */
  score: number;
  /** Positive strength in [0, 1]. */
  positive: number;
  /** Negative strength in [0, 1]. */
  negative: number;
  /** Confidence in [0, 1]. */
  confidence: number;
}

/**
 * The complete emotion analysis result.
 * The `primary`, `intensity`, `sentiment`, and `scores` fields make this
 * structurally assignable to BrainCore's EmotionResult.
 */
export interface EmotionResult {
  /** Dominant emotion. */
  primary: string;
  /** Secondary emotion, if meaningfully present. */
  secondary?: string;
  /** Intensity in [0, 100]. */
  intensity: number;
  /** Normalized intensity in [0, 1]. */
  intensityNormalized: number;
  /** Classification confidence in [0, 1]. */
  confidence: number;
  /** Three-valued sentiment (BrainCore-compatible). */
  sentiment: Sentiment;
  /** Extended sentiment label (may be 'mixed'). */
  sentimentLabel: SentimentLabel;
  /** Per-emotion normalized scores. */
  scores: Record<string, number>;
  /** Ranked emotion scores. */
  emotions: EmotionScore[];
  /** Whether the top-2 emotions are ambiguous. */
  ambiguous: boolean;
  /** Epoch ms when produced. */
  timestamp: number;
  /** Forward-compatible metadata. */
  metadata: Record<string, unknown>;
}

/** Mood trend direction over the tracked window. */
export type MoodTrend = 'improving' | 'declining' | 'stable' | 'volatile';

/** Aggregated long-term mood state. */
export interface MoodState {
  /** Dominant recent emotion. */
  dominantEmotion: string;
  /** Extended sentiment label of the mood. */
  label: SentimentLabel;
  /** Average valence in [-1, 1]. */
  valence: number;
  /** Average intensity in [0, 100]. */
  intensity: number;
  /** Trend direction. */
  trend: MoodTrend;
  /** Number of samples the mood is based on. */
  sampleSize: number;
  /** Epoch ms of last update. */
  updatedAt: number;
}

/** A single entry in the emotional timeline. */
export interface EmotionTimelineEntry {
  emotion: string;
  sentiment: Sentiment;
  intensity: number;
  valence: number;
  confidence: number;
  input?: string;
  timestamp: number;
}

/** The ordered emotional timeline. */
export type EmotionTimeline = EmotionTimelineEntry[];

/** Contextual signals used to bias emotion detection. */
export interface EmotionContextData {
  /** Recent conversation turns (most recent last). */
  conversationHistory?: Array<{ role: string; content: string }>;
  /** The previously detected emotion. */
  previousEmotion?: string;
  /** Recent emotion timeline. */
  emotionHistory?: EmotionTimelineEntry[];
  /** Relevant memory snippets. */
  memoryContext?: string[];
  /** Current topic label. */
  topic?: string;
  /** Arbitrary additional signals. */
  variables?: Record<string, unknown>;
}

/** An empathetic reply produced by the empathy engine. */
export interface EmpathyReply {
  /** The reply text. */
  text: string;
  /** The tone used. */
  tone: ReplyTone;
  /** The emotion the reply responds to. */
  emotion: string;
}

/** A registrable emotion definition (built-in or custom). */
export interface EmotionDefinition {
  /** Unique emotion identifier. */
  type: string;
  /** Keywords indicating this emotion. */
  keywords: string[];
  /** Valence in [-1, 1]. */
  valence: number;
  /** Dominant sentiment. */
  sentiment: Sentiment;
  /** Match weight (default 1). */
  weight: number;
  /** Whether enabled. */
  enabled: boolean;
}

/** Options for constructing/initializing the engine. */
export interface EmotionEngineOptions {
  /** Enable mood tracking (default true). */
  trackMood?: boolean;
  /** Enable emotion memory (default true). */
  useMemory?: boolean;
  /** Enable context-aware biasing (default true). */
  useContext?: boolean;
  /** Engine version reported in metadata. */
  version?: string;
}

export { EmotionType, ReplyTone };
export type { Sentiment, SentimentLabel };
