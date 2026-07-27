/**
 * ============================================================================
 * Nexus AI OS — ContextAnalyzer
 * ----------------------------------------------------------------------------
 * Converts contextual signals (conversation history, memory, previous
 * intent, user state, active task, current app/page) into per-intent
 * confidence biases that refine classification.
 * ============================================================================
 */

import { IContextAnalyzer } from './interfaces';
import { IntentContext, IntentPrediction } from './types';
import { IntentName, INTENT_LIMITS } from './constants';
import { jaccardSimilarity, clamp } from './utils';

/**
 * Analyzes context to produce additive score deltas per intent. Deltas are
 * intentionally small so context refines — but never dominates — the base
 * classification.
 */
export class ContextAnalyzer implements IContextAnalyzer {
  /**
   * @param continuityBias Bias applied to the previous intent (continuity).
   * @param appBias Bias applied when the app maps to an intent.
   */
  constructor(
    private readonly continuityBias = 0.1,
    private readonly appBias = 0.12,
  ) {}

  /** Produces a map of intentName -> additive confidence delta. */
  public analyze(
    context: IntentContext | undefined,
    candidates: IntentPrediction[],
  ): Record<string, number> {
    const bias: Record<string, number> = {};
    if (!context) return bias;

    this.applyPreviousIntent(context, bias);
    this.applyIntentHistory(context, bias);
    this.applyActiveTask(context, bias);
    this.applyApplication(context, bias);
    this.applyPage(context, bias);
    this.applyConversationContinuity(context, candidates, bias);
    this.applyUserState(context, bias);

    // Clamp all deltas to a safe range.
    for (const key of Object.keys(bias)) {
      bias[key] = clamp(bias[key], -0.3, 0.3);
    }
    return bias;
  }

  /* ---------------------------- internals ---------------------------- */

  /** Boosts the previously detected intent slightly (dialogue continuity). */
  private applyPreviousIntent(
    ctx: IntentContext,
    bias: Record<string, number>,
  ): void {
    if (ctx.previousIntent) {
      bias[ctx.previousIntent] =
        (bias[ctx.previousIntent] ?? 0) + this.continuityBias;
    }
  }

  /** Reinforces intents that recur in the recent history window. */
  private applyIntentHistory(
    ctx: IntentContext,
    bias: Record<string, number>,
  ): void {
    const history = (ctx.intentHistory ?? []).slice(
      -INTENT_LIMITS.maxHistoryWindow,
    );
    const counts = new Map<string, number>();
    for (const h of history) {
      counts.set(h.intent, (counts.get(h.intent) ?? 0) + 1);
    }
    for (const [intent, count] of counts) {
      bias[intent] = (bias[intent] ?? 0) + clamp(count * 0.02, 0, 0.1);
    }
  }

  /** If a task is active, favor task-related intents. */
  private applyActiveTask(
    ctx: IntentContext,
    bias: Record<string, number>,
  ): void {
    if (!ctx.activeTask) return;
    for (const intent of [
      IntentName.TaskExecution,
      IntentName.TaskCancel,
      IntentName.Automation,
    ]) {
      bias[intent] = (bias[intent] ?? 0) + 0.08;
    }
  }

  /** Maps the current application to likely intents. */
  private applyApplication(
    ctx: IntentContext,
    bias: Record<string, number>,
  ): void {
    const app = ctx.currentApplication?.toLowerCase();
    if (!app) return;

    const appIntentMap: Record<string, IntentName[]> = {
      mail: [IntentName.Email],
      email: [IntentName.Email],
      outlook: [IntentName.Email, IntentName.Calendar],
      gmail: [IntentName.Email],
      calendar: [IntentName.Calendar, IntentName.Reminder, IntentName.Meeting],
      browser: [IntentName.Browser, IntentName.Search],
      chrome: [IntentName.Browser, IntentName.Search],
      vscode: [IntentName.CodeGeneration, IntentName.CodingHelp, IntentName.FileOperation],
      code: [IntentName.CodeGeneration, IntentName.CodingHelp],
      spotify: [IntentName.Music],
      youtube: [IntentName.Video],
      maps: [IntentName.Navigation],
      terminal: [IntentName.SystemControl, IntentName.FileOperation],
    };

    const mapped = appIntentMap[app];
    if (mapped) {
      for (const intent of mapped) {
        bias[intent] = (bias[intent] ?? 0) + this.appBias;
      }
    }
  }

  /** Uses the current page/route as a weaker application-like signal. */
  private applyPage(ctx: IntentContext, bias: Record<string, number>): void {
    const page = ctx.currentPage?.toLowerCase();
    if (!page) return;

    if (page.includes('settings')) {
      bias[IntentName.SystemControl] =
        (bias[IntentName.SystemControl] ?? 0) + 0.06;
    }
    if (page.includes('cart') || page.includes('checkout')) {
      bias[IntentName.Shopping] = (bias[IntentName.Shopping] ?? 0) + 0.08;
    }
    if (page.includes('editor') || page.includes('document')) {
      bias[IntentName.DocumentAnalysis] =
        (bias[IntentName.DocumentAnalysis] ?? 0) + 0.06;
    }
  }

  /**
   * Compares the latest user turn to recent conversation to detect topical
   * continuity, nudging conversational intents when highly similar.
   */
  private applyConversationContinuity(
    ctx: IntentContext,
    _candidates: IntentPrediction[],
    bias: Record<string, number>,
  ): void {
    const history = ctx.conversationHistory ?? [];
    if (history.length < 2) return;

    const last = history[history.length - 1]?.content ?? '';
    const prev = history[history.length - 2]?.content ?? '';
    const similarity = jaccardSimilarity(last, prev);

    if (similarity > 0.4) {
      bias[IntentName.Conversation] =
        (bias[IntentName.Conversation] ?? 0) + 0.05;
    }
  }

  /** Applies simple user-state heuristics (e.g. explicit mode flags). */
  private applyUserState(
    ctx: IntentContext,
    bias: Record<string, number>,
  ): void {
    const state = ctx.userState;
    if (!state) return;

    if (state.voiceMode === true) {
      bias[IntentName.VoiceCommand] =
        (bias[IntentName.VoiceCommand] ?? 0) + 0.1;
    }
    if (state.visionMode === true) {
      bias[IntentName.VisionCommand] =
        (bias[IntentName.VisionCommand] ?? 0) + 0.1;
    }
    if (state.learningMode === true) {
      bias[IntentName.Learning] = (bias[IntentName.Learning] ?? 0) + 0.08;
    }
  }
}
