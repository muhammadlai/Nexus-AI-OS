/**
 * Dependency-injection ports and component contracts.
 */

import type {
  ExecutionSchedule,
  Goal,
  GoalInput,
  GraphEdgeLike,
  GraphNodeLike,
  Plan,
  PlanEvent,
  PlanEventListener,
  PlanMetrics,
  PlanResult,
  PlannerOptions,
  PlanningContext,
  PlanningMetadata,
  PlanningStrategy,
  SerializedPlan,
  Task,
  TaskDraft,
  ValidationResult,
  Workflow,
} from "./types.js";

export interface PlanningLogger {
  debug?(message: string, data?: unknown): void;
  info?(message: string, data?: unknown): void;
  warn?(message: string, data?: unknown): void;
  error?(message: string, error?: unknown): void;
}

export interface PlanningClock {
  now(): Date;
}

export interface PlanningIdGenerator {
  create(prefix: string): string;
}

export interface IActionGraph<
  N extends GraphNodeLike,
  E extends GraphEdgeLike,
> {
  addNode(node: N): N;
  addEdge(edge: E): E;
  removeNode(nodeId: string): boolean;
  removeEdge(edgeId: string): boolean;
  getNode(nodeId: string): N | undefined;
  getEdge(edgeId: string): E | undefined;
  hasNode(nodeId: string): boolean;
  nodes(): readonly N[];
  edges(): readonly E[];
  dependenciesOf(nodeId: string): readonly N[];
  dependentsOf(nodeId: string): readonly N[];
  bfs(
    startIds: readonly string[],
    direction?: "out" | "in" | "both",
  ): readonly N[];
  dfs(
    startIds: readonly string[],
    direction?: "out" | "in" | "both",
  ): readonly N[];
  hasCycle(): boolean;
  topologicalSort(): readonly N[];
  levels(): readonly (readonly N[])[];
  criticalPathMs(
    weightOf: (node: N) => number,
  ): number;
  transitiveReduction(): readonly E[];
}

export interface ITaskPlanner {
  decompose(
    goal: Goal,
    context: PlanningContext,
    options: PlannerOptions,
  ): Promise<readonly TaskDraft[]>;

  estimateDraft(draft: TaskDraft): TaskDraft;
}

export interface IGoalPlanner {
  parseGoal(input: string | GoalInput | Goal): Goal;
  buildGoalTree(goal: Goal): Goal;
  generateMilestones(goal: Goal): readonly Goal[];
}

export interface IWorkflowPlanner {
  buildWorkflow(
    tasks: readonly Task[],
    planId: string,
  ): Workflow;
}

export interface IExecutionPlanner {
  buildSchedule(
    tasks: readonly Task[],
    satisfiedTaskIds?: ReadonlySet<string>,
  ): ExecutionSchedule;

  detectCycles(
    tasks: readonly Task[],
  ): readonly string[];
}

/**
 * Strategy plugin contract used by PlannerRegistry.
 */
export interface Planner {
  readonly id: string;
  readonly name: string;
  readonly capabilities: readonly string[];
  readonly strategies: readonly PlanningStrategy[];
  plan(
    goal: Goal,
    context: PlanningContext,
    options: PlannerOptions,
  ): Promise<readonly TaskDraft[]>;
}

export interface PlannerQuery {
  readonly strategy?: PlanningStrategy;
  readonly capability?: string;
}

export interface IPlannerRegistry {
  registerPlanner(planner: Planner): void;
  unregisterPlanner(plannerId: string): boolean;
  getPlanner(plannerId: string): Planner | undefined;
  listPlanners(): readonly Planner[];
  findPlanners(query?: PlannerQuery): readonly Planner[];
}

export interface PlanTaskExecutionRequest {
  readonly plan: Plan;
  readonly task: Task;
  readonly context: PlanningContext;
  readonly signal: AbortSignal;
  readonly attempt: number;
}

/**
 * Runtime execution port. PlanningEngine plans and orchestrates;
 * the host application supplies actual task execution.
 */
export interface PlanTaskExecutor {
  execute(
    request: PlanTaskExecutionRequest,
  ): Promise<unknown>;
}

export interface PlanRepository {
  save(plan: Plan): Promise<void>;
  load(planId: string): Promise<Plan | undefined>;
  remove(planId: string): Promise<boolean>;
}

export interface IPlanningEngine {
  createPlan(
    input: string | GoalInput | Goal,
    options?: PlannerOptions,
    context?: PlanningContext,
  ): Promise<Plan>;

  executePlan(
    planId: string,
    context?: PlanningContext,
  ): Promise<PlanResult>;

  pausePlan(planId: string): Plan;
  resumePlan(planId: string): Plan;
  cancelPlan(planId: string, reason?: string): Plan;

  replan(
    planId: string,
    context?: PlanningContext,
  ): Promise<Plan>;

  estimate(plan: Plan): Plan["estimation"];
  estimateTime(plan: Plan): number;
  estimateCost(plan: Plan): number;
  estimateResources(
    plan: Plan,
  ): Readonly<Record<string, number>>;
  estimateRisk(plan: Plan): Plan["estimation"]["risk"];

  validatePlan(plan: Plan): ValidationResult;
  optimizePlan(planId: string): Plan;

  clonePlan(planId: string, newName?: string): Plan;
  mergePlans(
    planIds: readonly string[],
    name?: string,
  ): Plan;
  splitPlan(
    planId: string,
    selector:
      | readonly string[]
      | ((task: Task) => boolean),
  ): readonly [Plan, Plan];

  serialize(plan: Plan): string;
  deserialize(payload: string): Plan;

  getPlan(planId: string): Plan | undefined;
  listPlans(): readonly Plan[];
  metrics(planId: string): PlanMetrics;

  subscribe(listener: PlanEventListener): () => void;
  destroy(): Promise<void>;
}

export interface PlanningAuditEvent {
  readonly type: string;
  readonly timestamp: string;
  readonly data: PlanningMetadata;
}

export interface PlanningAuditSink {
  write(event: PlanningAuditEvent): Promise<void>;
}
