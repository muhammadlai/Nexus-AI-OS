/**
 * ============================================================================
 * Nexus AI OS — Emotion Engine Constants
 * ----------------------------------------------------------------------------
 * Canonical emotion catalog, lexicons, valence weights, and thresholds.
 * Single source of truth for the entire emotion subsystem. Fully offline.
 * ============================================================================
 */

/** The canonical set of detectable emotions. */
export enum EmotionType {
  Happy = 'happy',
  Sad = 'sad',
  Angry = 'angry',
  Excited = 'excited',
  Neutral = 'neutral',
  Confused = 'confused',
  Surprised = 'surprised',
  Fear = 'fear',
  Disappointed = 'disappointed',
  Motivated = 'motivated',
  Grateful = 'grateful',
  Curious = 'curious',
  Frustrated = 'frustrated',
  Embarrassed = 'embarrassed',
  Proud = 'proud',
  Hopeful = 'hopeful',
}

/** Three-valued sentiment (BrainCore-compatible). */
export type Sentiment = 'positive' | 'negative' | 'neutral';

/** Extended sentiment label including mixed polarity. */
export type SentimentLabel = 'positive' | 'negative' | 'neutral' | 'mixed';

/** Reply tones supported by the empathy engine. */
export type ReplyTone =
  | 'supportive'
  | 'professional'
  | 'friendly'
  | 'motivational'
  | 'empathetic';

/** Confidence / intensity thresholds. */
export const EMOTION_THRESHOLDS = {
  /** Minimum normalized score for an emotion to be reported. */
  minScore: 0.08,
  /** Score separation below which classification is low-confidence. */
  ambiguityMargin: 0.1,
  /** Sentiment magnitude beyond which polarity is asserted. */
  sentimentMargin: 0.15,
  /** Both polarities above this → mixed sentiment. */
  mixedThreshold: 0.3,
} as const;

/** Operational limits. */
export const EMOTION_LIMITS = {
  maxInputLength: 8_000,
  maxMoodHistory: 200,
  maxMemoryTimeline: 500,
  recentWindow: 10,
  negationWindow: 3,
} as const;

/**
 * Valence weight per emotion in [-1, 1]. Drives mood valence and sentiment
 * inference for discrete emotions.
 */
export const EMOTION_VALENCE: Record<EmotionType, number> = {
  [EmotionType.Happy]: 0.8,
  [EmotionType.Excited]: 0.9,
  [EmotionType.Grateful]: 0.85,
  [EmotionType.Proud]: 0.8,
  [EmotionType.Hopeful]: 0.7,
  [EmotionType.Motivated]: 0.75,
  [EmotionType.Curious]: 0.4,
  [EmotionType.Surprised]: 0.1,
  [EmotionType.Neutral]: 0,
  [EmotionType.Confused]: -0.3,
  [EmotionType.Embarrassed]: -0.5,
  [EmotionType.Disappointed]: -0.6,
  [EmotionType.Fear]: -0.75,
  [EmotionType.Frustrated]: -0.7,
  [EmotionType.Sad]: -0.8,
  [EmotionType.Angry]: -0.85,
};

/** Mapping of each emotion to its dominant 3-valued sentiment. */
export const EMOTION_SENTIMENT: Record<EmotionType, Sentiment> = {
  [EmotionType.Happy]: 'positive',
  [EmotionType.Excited]: 'positive',
  [EmotionType.Grateful]: 'positive',
  [EmotionType.Proud]: 'positive',
  [EmotionType.Hopeful]: 'positive',
  [EmotionType.Motivated]: 'positive',
  [EmotionType.Curious]: 'positive',
  [EmotionType.Surprised]: 'neutral',
  [EmotionType.Neutral]: 'neutral',
  [EmotionType.Confused]: 'negative',
  [EmotionType.Embarrassed]: 'negative',
  [EmotionType.Disappointed]: 'negative',
  [EmotionType.Fear]: 'negative',
  [EmotionType.Frustrated]: 'negative',
  [EmotionType.Sad]: 'negative',
  [EmotionType.Angry]: 'negative',
};

/** Keyword lexicon per emotion (offline detection baseline). */
export const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  [EmotionType.Happy]: [
    'happy', 'glad', 'joy', 'joyful', 'delighted', 'pleased', 'cheerful',
    'content', 'wonderful', 'great', 'awesome', 'love', 'smile', 'nice',
  ],
  [EmotionType.Sad]: [
    'sad', 'unhappy', 'down', 'depressed', 'miserable', 'heartbroken',
    'crying', 'cry', 'gloomy', 'lonely', 'sorrow', 'grief', 'blue',
  ],
  [EmotionType.Angry]: [
    'angry', 'mad', 'furious', 'rage', 'hate', 'annoyed', 'irritated',
    'outraged', 'pissed', 'livid', 'hostile',
  ],
  [EmotionType.Excited]: [
    'excited', 'thrilled', 'ecstatic', 'pumped', 'stoked', 'cant wait',
    "can't wait", 'amazing', 'incredible', 'wow',
  ],
  [EmotionType.Neutral]: ['ok', 'okay', 'fine', 'alright', 'normal', 'meh'],
  [EmotionType.Confused]: [
    'confused', 'lost', 'unclear', 'dont understand', "don't understand",
    'puzzled', 'baffled', 'no idea', 'what do you mean',
  ],
  [EmotionType.Surprised]: [
    'surprised', 'shocked', 'astonished', 'unexpected', 'whoa', 'omg',
    'no way', 'really', 'unbelievable',
  ],
  [EmotionType.Fear]: [
    'afraid', 'scared', 'fear', 'terrified', 'anxious', 'nervous', 'worried',
    'panic', 'frightened', 'dread',
  ],
  [EmotionType.Disappointed]: [
    'disappointed', 'letdown', 'let down', 'unsatisfied', 'expected more',
    'underwhelmed', 'regret',
  ],
  [EmotionType.Motivated]: [
    'motivated', 'driven', 'determined', 'ready', 'lets do this',
    "let's do this", 'focused', 'ambitious', 'inspired',
  ],
  [EmotionType.Grateful]: [
    'grateful', 'thankful', 'thanks', 'thank you', 'appreciate',
    'appreciated', 'blessed',
  ],
  [EmotionType.Curious]: [
    'curious', 'wonder', 'interested', 'intrigued', 'how does', 'why does',
    'tell me more', 'fascinating',
  ],
  [EmotionType.Frustrated]: [
    'frustrated', 'stuck', 'annoying', 'fed up', 'cant get', "can't get",
    'not working', 'ugh', 'struggling',
  ],
  [EmotionType.Embarrassed]: [
    'embarrassed', 'ashamed', 'awkward', 'humiliated', 'sorry', 'my bad',
    'so silly',
  ],
  [EmotionType.Proud]: [
    'proud', 'accomplished', 'achieved', 'nailed it', 'succeeded',
    'did it', 'proud of',
  ],
  [EmotionType.Hopeful]: [
    'hopeful', 'hope', 'optimistic', 'looking forward', 'fingers crossed',
    'wish', 'better days',
  ],
};

/** Positive sentiment lexicon. */
export const POSITIVE_WORDS: string[] = [
  'good', 'great', 'love', 'happy', 'excellent', 'thanks', 'awesome', 'nice',
  'perfect', 'wonderful', 'glad', 'amazing', 'fantastic', 'brilliant', 'best',
  'enjoy', 'like', 'appreciate', 'success', 'win', 'positive',
];

/** Negative sentiment lexicon. */
export const NEGATIVE_WORDS: string[] = [
  'bad', 'hate', 'sad', 'angry', 'terrible', 'awful', 'worst', 'annoyed',
  'frustrated', 'broken', 'error', 'fail', 'failure', 'wrong', 'problem',
  'issue', 'poor', 'disappointed', 'ugly', 'hard', 'difficult', 'negative',
];

/** Words that amplify emotional intensity. */
export const INTENSIFIERS: string[] = [
  'very', 'so', 'really', 'extremely', 'incredibly', 'absolutely', 'totally',
  'super', 'highly', 'deeply', 'utterly', 'completely',
];

/** Words that negate/flip an adjacent sentiment. */
export const NEGATION_WORDS: string[] = [
  'not', 'no', 'never', 'none', 'cannot', "can't", "don't", "doesn't",
  "didn't", "won't", "isn't", "aren't", "wasn't", 'without', 'hardly',
];
