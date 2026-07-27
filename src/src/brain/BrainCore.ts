/**
 * ============================================================================
 * Nexus AI OS — BrainCore
 * ----------------------------------------------------------------------------
 * The central intelligence orchestrator of Nexus AI OS.
 *
 * BrainCore is the single point of coordination for the entire AI lifecycle.
 * It receives user input, routes it through the cognitive pipeline
 * (intent -> emotion -> reasoning -> decision -> planning -> execution),
 * maintains the live AI state, tracks conversations and tasks, manages
 * multiple agents, and bridges every specialized engine of the system.
 * ============================================================================
 */

import { BrainState, BrainLifecycle, TaskPriority, TaskStatus } from './enums';
import {
  BrainMessage,
  Conversation,
  AIAgent,
  ExecutionPlan,
  Task,
  BrainContext,
  IntentResult,
  EmotionResult,
  ReasoningResult,
  Decision,
  ProcessResult,
  BrainEventType,
  BrainEvent,
  BrainEventListener,
} from './types';
import { BrainEngines, BrainConfig } from './engines';
import { generateId, resolveMaybe } from './utils';

/**
 * BrainCore — the central orchestrator of Nexus AI OS.
 *
 * Access the shared instance via {@link BrainCore.getInstance} or the
 * exported {@link brainCore} singleton.
 */
export class BrainCore {
  /** The singleton instance. */
  private static _instance: BrainCore | null = null;

  /* ---- Lifecycle & state ---- */
  private _lifecycle: BrainLifecycle = BrainLifecycle.Uninitialized;
  private _state: BrainState = BrainState.Idle;

  /* ---- Engines ---- */
  private engines: BrainEngines = {};

  /* ---- Runtime data ---- */
  private agents: Map<string, AIAgent> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private tasks: Map<string, Task> = new Map();

  private activeConversationId: string | null = null;
  private activeTaskId: string | null = null;

  private context: BrainContext = { variables: {} };

  /* ---- Configuration ---- */
  private autoExecute = true;
  private maxConversationHistory = 500;

  /* ---- Event system ---- */
  private listeners: Map<BrainEventType, Set<BrainEventListener>> = new Map();

  /** Private constructor enforces the singleton pattern. */
  private constructor() {
    /* Intentionally empty — configuration happens in initialize(). */
  }

  /* ------------------------------------------------------------------ */
  /* Singleton access                                                    */
  /* ------------------------------------------------------------------ */

  /** Returns the shared BrainCore instance, creating it on first access. */
  public static getInstance(): BrainCore {
    if (!BrainCore._instance) {
      BrainCore._instance = new BrainCore();
    }
    return BrainCore._instance;
  }

  /* ------------------------------------------------------------------ */
  /* Public getters                                                      */
  /* ------------------------------------------------------------------ */

  /** The current cognitive state of the Brain. */
  public get state(): BrainState {
    return this._state;
  }

  /** The current lifecycle status of the Brain. */
  public get lifecycle(): BrainLifecycle {
    return this._lifecycle;
  }

  /** A snapshot copy of the current context. */
  public get currentContext(): Readonly<BrainContext> {
    return { ...this.context, variables: { ...this.context.variables } };
  }

  /** The active conversation, if any. */
  public get activeConversation(): Conversation | undefined {
    return this.activeConversationId
      ? this.conversations.get(this.activeConversationId)
      : undefined;
  }

  /** The active task, if any. */
  public get activeTask(): Task | undefined {
    return this.activeTaskId ? this.tasks.get(this.activeTaskId) : undefined;
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle methods                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Initializes the Brain with optional engines, agents, and configuration.
   * Safe to call once; subsequent calls merge configuration.
   */
  public async initialize(config: BrainConfig = {}): Promise<void> {
    if (this._lifecycle === BrainLifecycle.Destroyed) {
      throw new Error('[BrainCore] Cannot initialize a destroyed instance.');
    }

    this._lifecycle = BrainLifecycle.Initializing;

    try {
      if (config.engines) {
        this.configure(config.engines);
      }

      if (config.agents) {
        for (const agent of config.agents) {
          this.registerAgent(agent);
        }
      }

      if (typeof config.autoExecute === 'boolean') {
        this.autoExecute = config.autoExecute;
      }
      if (typeof config.maxConversationHistory === 'number') {
        this.maxConversationHistory = Math.max(1, config.maxConversationHistory);
      }

      this._lifecycle = BrainLifecycle.Ready;
      this.updateState(BrainState.Idle);
    } catch (error) {
      this._lifecycle = BrainLifecycle.Uninitialized;
      this.fail(error);
      throw error;
    }
  }

  /** Registers or replaces one or more engines at runtime. */
  public configure(engines: BrainEngines): void {
    this.engines = { ...this.engines, ...engines };
  }

  /* ------------------------------------------------------------------ */
  /* Agent management                                                    */
  /* ------------------------------------------------------------------ */

  /** Registers a new agent (or replaces one with the same id). */
  public registerAgent(agent: AIAgent): void {
    this.agents.set(agent.id, { ...agent });
  }

  /** Removes an agent by id. */
  public removeAgent(agentId: string): boolean {
    if (this.context.activeAgentId === agentId) {
      this.context.activeAgentId = undefined;
    }
    return this.agents.delete(agentId);
  }

  /** Returns all registered agents. */
  public listAgents(): AIAgent[] {
    return Array.from(this.agents.values());
  }

  /** Sets the currently active agent for delegation. */
  public setActiveAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`[BrainCore] Unknown agent: ${agentId}`);
    }
    this.context.activeAgentId = agentId;
  }

  /* ------------------------------------------------------------------ */
  /* Conversation management                                             */
  /* ------------------------------------------------------------------ */

  /**
   * Starts (and activates) a new conversation. Delegates to the
   * ConversationEngine when available, otherwise manages it in-memory.
   */
  public async startConversation(title?: string): Promise<Conversation> {
    this.ensureReady();

    let conversation: Conversation;

    if (this.engines.conversation) {
      conversation = await resolveMaybe(this.engines.conversation.create(title));
    } else {
      const now = Date.now();
      conversation = {
        id: generateId('conv'),
        title,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    this.conversations.set(conversation.id, conversation);
    this.activeConversationId = conversation.id;
    this.context.conversationId = conversation.id;

    return conversation;
  }

  /* ------------------------------------------------------------------ */
  /* Core pipeline: processMessage                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Processes a single user message through the full cognitive pipeline:
   *
   *   listening -> intent -> emotion -> reasoning -> decision
   *             -> [planning -> executing] -> speaking -> completed
   */
  public async processMessage(
    input: string,
    conversationId?: string,
  ): Promise<ProcessResult> {
    this.ensureReady();

    const conv =
      (conversationId && this.conversations.get(conversationId)) ||
      this.activeConversation ||
      (await this.startConversation());

    this.activeConversationId = conv.id;
    this.context.conversationId = conv.id;

    try {
      this.updateState(BrainState.Listening);

      const userMessage: BrainMessage = {
        id: generateId('msg'),
        role: 'user',
        content: input,
        timestamp: Date.now(),
      };
      await this.appendMessage(conv, userMessage);
      this.emit('messageReceived', userMessage);

      // ---- 1. Intent detection ----
      let intent: IntentResult | undefined;
      if (this.engines.intent) {
        this.updateState(BrainState.Thinking);
        intent = await resolveMaybe(
          this.engines.intent.detect(input, this.context),
        );
        this.context.intent = intent;
      }

      // ---- 2. Emotion analysis ----
      let emotion: EmotionResult | undefined;
      if (this.engines.emotion) {
        emotion = await resolveMaybe(
          this.engines.emotion.analyze(input, this.context),
        );
        this.context.emotion = emotion;
      }

      // ---- 3. Reasoning ----
      let reasoning: ReasoningResult;
      if (this.engines.reasoning) {
        this.updateState(BrainState.Reasoning);
        reasoning = await resolveMaybe(
          this.engines.reasoning.reason(input, this.context),
        );
      } else {
        reasoning = {
          answer:
            'Reasoning engine is not available. Message received and acknowledged.',
          confidence: 0,
        };
      }

      // ---- 4. Decision ----
      let decision: Decision | undefined;
      if (this.engines.decision) {
        decision = await resolveMaybe(
          this.engines.decision.decide(reasoning, this.context),
        );
      }

      // ---- 5. Planning (conditional) ----
      let plan: ExecutionPlan | undefined;
      let taskResult: unknown;

      if (decision?.shouldPlan && this.engines.planner) {
        const goal = decision.action || reasoning.answer;
        plan = await this.planTask(goal);

        // ---- 6. Execution (conditional) ----
        if ((decision.shouldExecute || this.autoExecute) && plan) {
          taskResult = await this.executeTask(plan);
        }
      }

      // ---- 7. Speaking / respond ----
      this.updateState(BrainState.Speaking);

      const assistantMessage: BrainMessage = {
        id: generateId('msg'),
        role: 'assistant',
        content: reasoning.answer,
        timestamp: Date.now(),
        agentId: this.context.activeAgentId,
        metadata: { intent, emotion, decision },
      };
      await this.appendMessage(conv, assistantMessage);

      // ---- 8. Completed ----
      this.updateState(BrainState.Completed);

      const result: ProcessResult = {
        conversationId: conv.id,
        response: reasoning.answer,
        intent,
        emotion,
        reasoning,
        decision,
        plan,
        taskResult,
        state: this._state,
      };

      this.emit('messageProcessed', result);

      this.updateState(BrainState.Idle);

      return result;
    } catch (error) {
      this.fail(error);
      throw error;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Planning                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Generates an execution plan for the given goal via the ActionPlanner.
   * Creates and activates a corresponding Task.
   */
  public async planTask(
    goal: string,
    priority: TaskPriority = TaskPriority.Normal,
  ): Promise<ExecutionPlan> {
    this.ensureReady();
    this.updateState(BrainState.Planning);

    let plan: ExecutionPlan;

    if (this.engines.planner) {
      plan = await resolveMaybe(this.engines.planner.plan(goal, this.context));
    } else {
      plan = {
        id: generateId('plan'),
        goal,
        priority,
        createdAt: Date.now(),
        steps: [
          {
            id: generateId('step'),
            description: goal,
            action: 'noop',
            status: TaskStatus.Pending,
          },
        ],
      };
    }

    const now = Date.now();
    const task: Task = {
      id: generateId('task'),
      goal,
      plan,
      status: TaskStatus.Pending,
      priority,
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);
    this.activeTaskId = task.id;
    this.context.taskId = task.id;

    this.emit('planGenerated', plan);
    return plan;
  }

  /* ------------------------------------------------------------------ */
  /* Execution                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Executes an execution plan through the TaskExecutor and updates the
   * associated task's status and result.
   */
  public async executeTask(plan: ExecutionPlan): Promise<unknown> {
    this.ensureReady();
    this.updateState(BrainState.Executing);

    const task = this.findTaskByPlan(plan.id);

    if (task) {
      task.status = TaskStatus.InProgress;
      task.updatedAt = Date.now();
    }

    this.emit('taskStarted', { plan, taskId: task?.id });

    try {
      let result: unknown;

      if (this.engines.executor) {
        result = await resolveMaybe(
          this.engines.executor.execute(plan, this.context),
        );
      } else {
        for (const step of plan.steps) {
          step.status = TaskStatus.Completed;
        }
        result = { executed: false, reason: 'No TaskExecutor registered.' };
      }

      if (task) {
        task.status = TaskStatus.Completed;
        task.result = result;
        task.updatedAt = Date.now();
      }

      this.emit('taskCompleted', { plan, taskId: task?.id, result });
      return result;
    } catch (error) {
      if (task) {
        task.status = TaskStatus.Failed;
        task.error = error instanceof Error ? error.message : String(error);
        task.updatedAt = Date.now();
      }
      this.fail(error);
      throw error;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Memory                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Persists a value into memory via the MemoryEngine.
   * Falls back to storing within the context variables when no engine exists.
   */
  public async remember(
    key: string,
    value: unknown,
    tags?: string[],
  ): Promise<void> {
    if (this.engines.memory) {
      await resolveMaybe(this.engines.memory.store(key, value, tags));
    } else {
      this.context.variables[key] = value;
    }
  }

  /**
   * Recalls a value from memory via the MemoryEngine.
   * Falls back to reading from context variables when no engine exists.
   */
  public async recall<T = unknown>(key: string): Promise<T | undefined> {
    if (this.engines.memory) {
      return (await resolveMaybe(this.engines.memory.retrieve<T>(key))) as
        | T
        | undefined;
    }
    return this.context.variables[key] as T | undefined;
  }

  /* ------------------------------------------------------------------ */
  /* State management                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Updates the Brain's cognitive state and notifies observers.
   * Public so external orchestrators can drive state where appropriate.
   */
  public updateState(state: BrainState): void {
    if (this._state === state) return;
    const previous = this._state;
    this._state = state;
    this.emit('stateChanged', { previous, current: state });
  }

  /* ------------------------------------------------------------------ */
  /* Shutdown & teardown                                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Gracefully stops any in-flight work and returns the Brain to idle.
   * The instance remains usable and can resume processing.
   */
  public async stop(): Promise<void> {
    try {
      const task = this.activeTask;
      if (task?.plan && this.engines.executor?.cancel) {
        await resolveMaybe(this.engines.executor.cancel(task.plan.id));
        task.status = TaskStatus.Cancelled;
        task.updatedAt = Date.now();
      }
    } finally {
      this._lifecycle = BrainLifecycle.Stopped;
      this.updateState(BrainState.Idle);
    }
  }

  /**
   * Fully tears down the Brain, releasing all runtime data and listeners.
   */
  public async destroy(): Promise<void> {
    await this.stop();

    this.agents.clear();
    this.conversations.clear();
    this.tasks.clear();
    this.listeners.clear();

    this.activeConversationId = null;
    this.activeTaskId = null;
    this.context = { variables: {} };
    this.engines = {};

    this._lifecycle = BrainLifecycle.Destroyed;
    this._state = BrainState.Idle;

    BrainCore._instance = null;
  }

  /* ------------------------------------------------------------------ */
  /* Event subscription                                                  */
  /* ------------------------------------------------------------------ */

  /** Subscribes to a Brain event. Returns an unsubscribe function. */
  public on(type: BrainEventType, listener: BrainEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    return () => this.off(type, listener);
  }

  /** Unsubscribes a previously registered listener. */
  public off(type: BrainEventType, listener: BrainEventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                    */
  /* ------------------------------------------------------------------ */

  /** Emits a Brain event to all subscribed listeners. */
  private emit(type: BrainEventType, payload?: unknown): void {
    const event: BrainEvent = { type, timestamp: Date.now(), payload };
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(event);
      } catch {
        // Listener failures must never break the pipeline.
      }
    }
  }

  /** Transitions to the error state and emits an error event. */
  private fail(error: unknown): void {
    this.updateState(BrainState.Error);
    this.emit('error', {
      message: error instanceof Error ? error.message : String(error),
      error,
    });
  }

  /** Appends a message to a conversation, respecting history limits. */
  private async appendMessage(
    conversation: Conversation,
    message: BrainMessage,
  ): Promise<void> {
    conversation.messages.push(message);
    conversation.updatedAt = message.timestamp;

    if (conversation.messages.length > this.maxConversationHistory) {
      conversation.messages.splice(
        0,
        conversation.messages.length - this.maxConversationHistory,
      );
    }

    if (this.engines.conversation) {
      await resolveMaybe(
        this.engines.conversation.append(conversation.id, message),
      );
    }
  }

  /** Finds the task associated with a given plan id. */
  private findTaskByPlan(planId: string): Task | undefined {
    for (const task of this.tasks.values()) {
      if (task.plan?.id === planId) return task;
    }
    return undefined;
  }

  /** Guards operations that require an initialized, non-destroyed Brain. */
  private ensureReady(): void {
    if (this._lifecycle === BrainLifecycle.Destroyed) {
      throw new Error('[BrainCore] Instance has been destroyed.');
    }
    if (
      this._lifecycle === BrainLifecycle.Uninitialized ||
      this._lifecycle === BrainLifecycle.Initializing
    ) {
      throw new Error('[BrainCore] Call initialize() before use.');
    }
  }
}

/** The shared BrainCore singleton for global access across Nexus AI OS. */
export const brainCore: BrainCore = BrainCore.getInstance();

export default brainCore;
