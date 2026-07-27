/**
 * ============================================================================
 * Nexus AI OS — EmpathyEngine
 * ----------------------------------------------------------------------------
 * Generates empathetic, supportive, professional, friendly, and motivational
 * replies tailored to the detected emotion. Fully offline, template-driven,
 * and deterministic (selection varies with intensity for natural variety).
 * ============================================================================
 */

import { IEmpathyEngine } from './interfaces';
import { EmotionResult, EmpathyReply } from './types';
import { EmotionType, ReplyTone } from './constants';

/** Template bundle: emotion-specific lines plus a sentiment fallback. */
interface ToneTemplates {
  byEmotion: Partial<Record<string, string[]>>;
  positiveFallback: string[];
  negativeFallback: string[];
  neutralFallback: string[];
}

/** Template-driven empathetic reply generator. */
export class EmpathyEngine implements IEmpathyEngine {
  private readonly templates: Record<ReplyTone, ToneTemplates>;

  constructor() {
    this.templates = this.buildTemplates();
  }

  /** Generates a reply in the requested tone (default: empathetic). */
  public generate(
    result: EmotionResult,
    tone: ReplyTone = 'empathetic',
  ): EmpathyReply {
    const bundle = this.templates[tone];
    const emotion = result.primary;

    const emotionLines = bundle.byEmotion[emotion];
    const pool =
      emotionLines && emotionLines.length > 0
        ? emotionLines
        : this.fallbackFor(bundle, result);

    const text = this.select(pool, result.intensity);
    return { text, tone, emotion };
  }

  /** Supportive reply. */
  public supportiveReply(result: EmotionResult): EmpathyReply {
    return this.generate(result, 'supportive');
  }

  /** Professional reply. */
  public professionalReply(result: EmotionResult): EmpathyReply {
    return this.generate(result, 'professional');
  }

  /** Friendly reply. */
  public friendlyReply(result: EmotionResult): EmpathyReply {
    return this.generate(result, 'friendly');
  }

  /** Motivational reply. */
  public motivationalReply(result: EmotionResult): EmpathyReply {
    return this.generate(result, 'motivational');
  }

  /** Empathetic reply. */
  public empatheticReply(result: EmotionResult): EmpathyReply {
    return this.generate(result, 'empathetic');
  }

  /* ---------------------------- internals ---------------------------- */

  /** Chooses a sentiment-appropriate fallback pool. */
  private fallbackFor(bundle: ToneTemplates, result: EmotionResult): string[] {
    if (result.sentiment === 'positive') return bundle.positiveFallback;
    if (result.sentiment === 'negative') return bundle.negativeFallback;
    return bundle.neutralFallback;
  }

  /** Deterministically selects a line, varying with intensity. */
  private select(pool: string[], intensity: number): string {
    if (pool.length === 0) return '';
    const index = Math.min(
      pool.length - 1,
      Math.floor((intensity / 100) * pool.length),
    );
    return pool[index];
  }

  /** Builds the full tone → template library. */
  private buildTemplates(): Record<ReplyTone, ToneTemplates> {
    return {
      empathetic: {
        byEmotion: {
          [EmotionType.Sad]: [
            "I'm sorry you're feeling down. I'm here with you.",
            "That sounds really hard. It's okay to feel this way.",
            "I truly feel for you — you don't have to face this alone.",
          ],
          [EmotionType.Angry]: [
            'I understand this is frustrating. Your feelings are valid.',
            'It makes sense that you feel angry about this.',
            "That would upset anyone — let's work through it together.",
          ],
          [EmotionType.Fear]: [
            "It's natural to feel anxious. Take a breath — I'm here.",
            'I hear your worry. Let’s take this one step at a time.',
            "You're safe to share this with me. We'll figure it out.",
          ],
          [EmotionType.Frustrated]: [
            'I can tell this is frustrating. Let’s untangle it together.',
            'That sounds exhausting. We’ll get past this blocker.',
          ],
          [EmotionType.Happy]: [
            "I'm so glad to hear that! It's wonderful.",
            'That’s lovely — your happiness matters.',
          ],
        },
        positiveFallback: [
          "I'm really glad you're feeling this way.",
          "That's wonderful to hear.",
        ],
        negativeFallback: [
          "I'm here for you, and your feelings are valid.",
          "I'm sorry you're going through this.",
        ],
        neutralFallback: ["Thanks for sharing. I'm listening.", 'I understand.'],
      },
      supportive: {
        byEmotion: {
          [EmotionType.Sad]: [
            "You're stronger than you know, and I'm right here to help.",
            'Whatever you need, I’ve got your back.',
          ],
          [EmotionType.Disappointed]: [
            "Setbacks happen — this doesn't define you.",
            'We can find another way forward together.',
          ],
          [EmotionType.Embarrassed]: [
            "Don't be hard on yourself — everyone stumbles sometimes.",
            'It’s completely okay. Let’s move forward.',
          ],
        },
        positiveFallback: ['I’m cheering you on!', 'Keep going — you’ve got this.'],
        negativeFallback: [
          "I've got your back through this.",
          "You're not alone — let's handle it together.",
        ],
        neutralFallback: ['I’m here whenever you need support.', 'Happy to help.'],
      },
      professional: {
        byEmotion: {
          [EmotionType.Confused]: [
            'Let me clarify this clearly and concisely for you.',
            'I’ll break this down into clear steps.',
          ],
          [EmotionType.Frustrated]: [
            'Understood. Let’s resolve this efficiently.',
            'I’ll address the issue systematically.',
          ],
        },
        positiveFallback: [
          'Noted with appreciation. How may I assist further?',
          'Understood. I’ll proceed accordingly.',
        ],
        negativeFallback: [
          'Understood. I’ll work to resolve this promptly.',
          'Acknowledged. Let’s address this step by step.',
        ],
        neutralFallback: ['Understood. How can I assist?', 'Noted. Proceeding.'],
      },
      friendly: {
        byEmotion: {
          [EmotionType.Happy]: [
            'Yay! That’s awesome to hear! 😊',
            'Love that energy — let’s keep it going!',
          ],
          [EmotionType.Excited]: [
            'That’s so exciting! I’m hyped for you!',
            'Amazing! Let’s dive right in!',
          ],
          [EmotionType.Curious]: [
            'Ooh, great question — let’s explore it!',
            'I love your curiosity! Let’s find out together.',
          ],
        },
        positiveFallback: ['That’s great! 😊', 'Nice — love to hear it!'],
        negativeFallback: [
          'Aw, that’s no fun. Let’s sort it out together!',
          'Don’t worry, we’ll figure this out!',
        ],
        neutralFallback: ['Gotcha! What’s next?', 'Sure thing!'],
      },
      motivational: {
        byEmotion: {
          [EmotionType.Motivated]: [
            'That’s the spirit — channel that drive and go for it!',
            'You’re unstoppable right now. Let’s make it happen!',
          ],
          [EmotionType.Hopeful]: [
            'Hold on to that hope — great things are ahead!',
            'Your optimism will carry you far. Keep going!',
          ],
          [EmotionType.Disappointed]: [
            'Every setback is a setup for a comeback. Keep pushing!',
            'This is just a chapter, not the whole story. You’ve got this!',
          ],
          [EmotionType.Frustrated]: [
            'Breakthroughs come right after the hardest moments. Stay with it!',
            'You’re closer than you think — don’t stop now!',
          ],
        },
        positiveFallback: [
          'Keep that momentum — you’re doing great!',
          'Onward and upward! 🚀',
        ],
        negativeFallback: [
          'Tough moments build strong people. Keep going!',
          'You’ve overcome before — you’ll overcome again!',
        ],
        neutralFallback: ['Let’s make today count!', 'Ready when you are — let’s go!'],
      },
    };
  }
}
