/**
 * Core domain types for the Nexus AI OS Planning Engine.
 */

export enum PlanStatus {
  DRAFT = "Draft",
  READY = "Ready",
  RUNNING = "Running",
  PAUSED = "Paused",
  COMPLETED = "Completed",
  FAILED = "Failed",
  CANCELLED = "Cancelled",
}

export enum TaskStatus {
  PENDING = "Pending",
  WAITING = "Waiting",
  RUNNING = "Running",
  COMPLETED = "Completed",
  FAILED = "Failed",
  SKIPPED = "Skipped",
}

export enum PlanPriority {
  CRITICAL = "Critical",
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
}

export enum ExecutionMode {
  SEQUENTIAL = "Sequential",
  PARALLEL = "Parallel",
  HYBRID = "Hybrid",
}

export enum RetryPolicy {
  NEVER = "Never",
  ONCE = "Once",
  LIMITED = "Limited",
  INFINITE = "Infinite",
}

export enum PlanningStrategy {
  GREEDY = "Greedy",
  OPTIMAL = "Optimal",
  BALANCED = "Balanced",
  ADAPTIVE = "Adaptive",
}

export enum GoalType {
  BUSINESS = "Business",
  TECHNICAL = "Technical",
  CREATIVE = "Creative",
  OPERATIONAL = "Operational",
  LEARNING = "Learning",
  CUSTOM = "Custom",
}

export enum RiskLevel {
  LOW = "Low",
  MODERATE = "Moderate",
  HIGH = "High",
  CRITICAL = "Critical",
}

export enum WorkflowNodeType {
  TASK = "Task",
  CONDITION = "Condition",
  LOOP = "Loop",
  BRANCH = "Branch",
  MERGE = "Merge",
  RECOVERY = "Recovery",
}

export enum WorkflowEdgeKind {
  NEXT = "next",
  CONDITION_TRUE = "condition-true",
  CONDITION_FALSE = "condition-false",
  ERROR = "error",
  RECOVERY = "recovery",
  LOOP_BACK = "loop-back",
}

export enum PlanEventType {
  PLAN_CREATED = "plan.created",
  PLAN_VALIDATED = "plan.validated",
  PLAN_STARTED = "plan.started",
  PLAN_PAUSED = "plan.paused",
  PLAN_RESUMED = "plan.resumed",
  PLAN_CANCELLED = "plan.cancelled",
  PLAN_COMPLETED = "plan.completed",
  PLAN_FAILED = "plan.failed",
  PLAN_REPLANNED = "plan.replanned",
  PLAN_OPTIMIZED = "plan.optimized",
  PLAN_MERGED = "plan.merged",
  PLAN_SPLIT = "plan.split",
  PLAN_CLONED = "plan.cloned",
  TASK_STATUS_CHANGED = "task.status_changed",
  TASK_RETRY = "task.retry",
  METRICS_UPDATED = "metrics.updated",
  ERROR = "error",
}

export type PlanningMetadata = Readonly<Record<string, unknown>>;

/**
 * Removes readonly modifiers recursively so the engine can maintain
 * internal mutable state while exposing immutable snapshots publicly.
 */
export type DeepWriteable<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends ReadonlyArray<infer U>
      ? DeepWriteable<U>[]
      : T extends object
        ? { -readonly [K in keyof T]: DeepWriteable<T[K]> }
        : T;

export interface RetryPolicyConfig {
  readonly mode: RetryPolicy;
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoffMultiplier: number;
}

export interface Dependency {
  readonly taskId: string;
  readonly kind: "hard" | "soft";
  readonly description?: string;
}

export interface Estimation {
  readonly durationMs: number;
  readonly cost: number;
  readonly resources: Readonly<Record<string, number>>;
  readonly complexity: number;
  readonly risk: RiskLevel;
  readonly riskScore: number;
  readonly confidence: number;
}

export interface GraphNodeLike {
  readonly id: string;
}

export interface GraphEdgeLike {
  readonly id: string;
  readonly source: string;
  readonly target: string;
}

export interface Goal {
  readonly id: string;
  readonly description: string;
  readonly type: GoalType;
  readonly priority: PlanPriority;
  readonly successCriteria: readonly string[];
  readonly constraints: readonly string[];
  readonly subGoals: readonly Goal[];
  readonly parentGoalId?: string;
  readonly deadline?: string;
  readonly metadata?: PlanningMetadata;
}

export interface GoalInput {
  readonly description: string;
  readonly type?: GoalType;
  readonly priority?: PlanPriority;
  readonly successCriteria?: readonly string[];
  readonly constraints?: readonly string[];
  readonly subGoals?: readonly (Goal | GoalInput)[];
  readonly deadline?: string;
  readonly metadata?: PlanningMetadata;
}

export interface Task {
  readonly id: string;
  readonly planId: string;
  readonly title: string;
  readonly description?: string;
  readonly action: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly dependencies: readonly Dependency[];
  readonly priority: PlanPriority;
  readonly status: TaskStatus;
  readonly mode: ExecutionMode;
  readonly retryPolicy: RetryPolicyConfig;
  readonly estimation: Estimation;
  readonly assignedAgentId?: string;
  readonly requiredCapabilities: readonly string[];
  readonly tags: readonly string[];
  readonly parentTaskId?: string;
  readonly subtasks: readonly string[];
  readonly deadline?: string;
  readonly attempts: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly result?: unknown;
  readonly error?: string;
  readonly metadata?: PlanningMetadata;
  readonly version: number;
}

export interface TaskDraft {
  readonly id?: string;
  readonly title: string;
  readonly description?: string;
  readonly action: string;
  readonly parameters?: PlanningMetadata;
  readonly dependencies?: readonly (string | Dependency)[];
  readonly priority?: PlanPriority;
  readonly mode?: ExecutionMode;
  readonly retryPolicy?: Partial<RetryPolicyConfig>;
  readonly estimatedDurationMs?: number;
  readonly estimatedCost?: number;
  readonly resources?: Readonly<Record<string, number>>;
  readonly risk?: RiskLevel;
  readonly requiredCapabilities?: readonly string[];
  readonly tags?: readonly string[];
  readonly assignedAgentId?: string;
  readonly parentTaskId?: string;
  readonly deadline?: string;
  readonly metadata?: PlanningMetadata;
}

export interface WorkflowNode {
  readonly id: string;
  readonly type: WorkflowNodeType;
  readonly label: string;
  readonly taskId?: string;
  readonly condition?: string;
  readonly maxIterations?: number;
  readonly metadata?: PlanningMetadata;
}

export interface WorkflowEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly kind: WorkflowEdgeKind;
  readonly label?: string;
  readonly condition?: string;
}

export interface Workflow {
  readonly id: string;
  readonly entryNodeId: string;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
}

export interface ActionNode extends GraphNodeLike {
  readonly action: string;
  readonly label: string;
  readonly payload?: PlanningMetadata;
}

export interface ActionEdge extends GraphEdgeLike {
  readonly kind: "dependency" | "sequence" | "conditional";
  readonly weight?: number;
}

export interface ExecutionNode {
  readonly taskId: string;
  readonly status: TaskStatus;
  readonly depth: number;
  readonly earliestStartOffsetMs: number;
  readonly parallelGroup: number;
}

export interface ExecutionEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: "dependency";
}

export interface ExecutionSchedule {
  readonly levels: readonly (readonly string[])[];
  readonly order: readonly string[];
  readonly nodes: readonly ExecutionNode[];
  readonly edges: readonly ExecutionEdge[];
  readonly criticalPathMs: number;
  readonly parallelismDegree: number;
}

export interface PlanHistoryEntry {
  readonly id: string;
  readonly type: string;
  readonly message: string;
  readonly timestamp: string;
}

export interface Plan {
  readonly id: string;
  readonly name: string;
  readonly goal: Goal;
  readonly status: PlanStatus;
  readonly strategy: PlanningStrategy;
  readonly executionMode: ExecutionMode;
  readonly priority: PlanPriority;
  readonly tasks: readonly Task[];
  readonly workflow?: Workflow;
  readonly estimation: Estimation;
  readonly agentId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly pausedAt?: string;
  readonly version: number;
  readonly history: readonly PlanHistoryEntry[];
  readonly metadata?: PlanningMetadata;
}

export interface PlanMetrics {
  readonly planId: string;
  readonly taskCount: number;
  readonly completedTasks: number;
  readonly failedTasks: number;
  readonly skippedTasks: number;
  readonly runningTasks: number;
  readonly progress: number;
  readonly estimatedDurationMs: number;
  readonly criticalPathMs: number;
  readonly estimatedCost: number;
  readonly estimatedRisk: RiskLevel;
  readonly complexity: number;
  readonly parallelismDegree: number;
  readonly calculatedAt: string;
}

export interface TaskExecutionOutcome {
  readonly taskId: string;
  readonly title: string;
  readonly success: boolean;
  readonly skipped: boolean;
  readonly attempts: number;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly output?: unknown;
  readonly error?: string;
}

export interface PlanResult {
  readonly planId: string;
  readonly success: boolean;
  readonly status: PlanStatus;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly outcomes: readonly TaskExecutionOutcome[];
  readonly metrics: PlanMetrics;
  readonly error?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface PlanningMemoryItem {
  readonly content: string;
  readonly importance?: number;
  readonly tags?: readonly string[];
}

export interface PlanningAgentInfo {
  readonly id: string;
  readonly capabilities: readonly string[];
  readonly load?: number;
  readonly priority?: number;
}

export interface PlanningContext {
  readonly conversationId?: string;
  readonly userId?: string;
  readonly agentId?: string;
  readonly memories?: readonly PlanningMemoryItem[];
  readonly availableAgents?: readonly PlanningAgentInfo[];
  readonly variables?: PlanningMetadata;
  readonly signal?: AbortSignal;
}

export interface PlannerOptions {
  readonly strategy?: PlanningStrategy;
  readonly executionMode?: ExecutionMode;
  readonly priority?: PlanPriority;
  readonly maximumDepth?: number;
  readonly maximumTasks?: number;
  readonly defaultRetryPolicy?: Partial<RetryPolicyConfig>;
  readonly parallelismLimit?: number;
  readonly optimize?: boolean;
  readonly draft?: boolean;
  readonly metadata?: PlanningMetadata;
}

export interface PlanEvent<T = unknown> {
  readonly type: PlanEventType;
  readonly timestamp: string;
  readonly planId?: string;
  readonly payload: T;
}

export type PlanEventListener = (
  event: PlanEvent,
) => void;

export interface SerializedPlan {
  readonly format: "nexus-plan";
  readonly version: number;
  readonly exportedAt: string;
  readonly plan: Plan;
}
