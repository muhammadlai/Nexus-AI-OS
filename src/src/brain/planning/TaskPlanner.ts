/**
 * Decomposes goals into dependency-aware, estimated task drafts.
 */

import {
  ACTION_KNOWLEDGE,
  DEFAULT_ACTION,
  DEFAULT_PLANNER_OPTIONS,
  DEFAULT_RETRY_POLICY,
  HIGH_RISK_KEYWORDS,
  PLANNING_LIMITS,
} from "./constants.js";

import type {
  ITaskPlanner,
  PlanningIdGenerator,
} from "./interfaces.js";

import {
  ExecutionMode,
  PlanPriority,
  RiskLevel,
  type Goal,
  type PlanningAgentInfo,
  type PlanningContext,
  type PlannerOptions,
  type TaskDraft,
} from "./types.js";

import {
  clamp,
  createUuid,
  normalizeText,
  riskScoreOf,
  splitClauses,
} from "./utils.js";

export class TaskPlanner implements ITaskPlanner {
  public constructor(
    private readonly idGenerator: Pick<
      PlanningIdGenerator,
      "create"
    > = {
      create: (prefix) => createUuid(prefix),
    },
  ) {}

  public async decompose(
    goal: Goal,
    context: PlanningContext,
    options: PlannerOptions,
  ): Promise<readonly TaskDraft[]> {
    const maximumDepth =
      options.maximumDepth ??
      DEFAULT_PLANNER_OPTIONS.maximumDepth;

    const drafts = this.decomposeGoal(
      goal,
      context,
      options,
      0,
      maximumDepth,
      undefined,
    );

    const maximumTasks =
      options.maximumTasks ??
      DEFAULT_PLANNER_OPTIONS.maximumTasks;

    const bounded = drafts.slice(
      0,
      Math.min(
        maximumTasks,
        PLANNING_LIMITS.maximumTasksPerPlan,
      ),
    );

    return bounded.map((draft) =>
      this.estimateDraft(
        this.assignAgent(draft, context),
      ),
    );
  }

  public estimateDraft(draft: TaskDraft): TaskDraft {
    const normalizedTitle = normalizeText(
      draft.title,
    );

    const knowledge =
      ACTION_KNOWLEDGE.find((entry) =>
        entry.keywords.some((keyword) =>
          normalizedTitle.includes(keyword),
        ),
      );

    const textFactor = Math.min(
      3,
      1 + draft.title.length / 240,
    );

    const dependencyFactor =
      1 + (draft.dependencies?.length ?? 0) * 0.12;

    const durationMs = Math.round(
      (draft.estimatedDurationMs ??
        (knowledge?.baseDurationMs ?? 6_000) *
          textFactor) * dependencyFactor,
    );

    const cost =
      draft.estimatedCost ??
      Number(
        ((knowledge?.baseCost ?? 0.05) *
          textFactor *
          dependencyFactor).toFixed(4),
      );

    const riskScore = this.inferRiskScore(
      normalizedTitle,
      draft.risk,
    );

    const complexity = clamp(
      0.2 +
        Math.min(0.4, draft.title.length / 400) +
        (draft.dependencies?.length ?? 0) * 0.08 +
        riskScore * 0.25,
    );

    return {
      ...draft,
      estimatedDurationMs: durationMs,
      estimatedCost: cost,
      resources: draft.resources ?? {
        cpu: Number(
          (0.1 + complexity * 0.5).toFixed(2),
        ),
        memoryMb: Math.round(
          64 + complexity * 512,
        ),
      },
      risk: this.riskLevelFromScore(riskScore),
      metadata: {
        ...(draft.metadata ?? {}),
        complexity: Number(complexity.toFixed(3)),
        riskScore: Number(riskScore.toFixed(3)),
        estimationConfidence: Number(
          (0.55 +
            Math.min(0.35, knowledge ? 0.25 : 0.1)),
        ),
      },
    };
  }

  private decomposeGoal(
    goal: Goal,
    context: PlanningContext,
    options: PlannerOptions,
    depth: number,
    maximumDepth: number,
    parentTaskId: string | undefined,
  ): TaskDraft[] {
    const clauses = splitClauses(goal.description);
    const drafts: TaskDraft[] = [];
    let previousTaskId: string | undefined;

    for (const clause of clauses) {
      const knowledge = this.matchKnowledge(
        clause.text,
      );

      const taskId =
        this.idGenerator.create("task");

      const dependencies: string[] = [];

      if (
        clause.connector === "then" &&
        previousTaskId
      ) {
        dependencies.push(previousTaskId);
      }

      const draft: TaskDraft = {
        id: taskId,
        title: clause.text,
        description: `Goal: ${goal.description}`,
        action: knowledge?.action ?? DEFAULT_ACTION,
        parameters: {
          goal: goal.description,
          clause: clause.text,
          goalType: goal.type,
        },
        dependencies,
        priority: goal.priority,
        mode:
          clause.connector === "and"
            ? ExecutionMode.PARALLEL
            : ExecutionMode.SEQUENTIAL,
        requiredCapabilities:
          knowledge?.capabilities ?? ["reasoning"],
        tags: [normalizeText(goal.type)],
        parentTaskId,
        deadline: goal.deadline,
        metadata: {
          goalId: goal.id,
          depth,
        },
      };

      drafts.push(draft);

      if (clause.connector === "then") {
        previousTaskId = taskId;
      }
    }

    if (depth < maximumDepth) {
      for (const subGoal of goal.subGoals) {
        const subDrafts = this.decomposeGoal(
          subGoal,
          context,
          options,
          depth + 1,
          maximumDepth,
          previousTaskId,
        );

        if (
          previousTaskId &&
          subDrafts.length > 0
        ) {
        }

        drafts.push(...subDrafts);

        const lastSub = subDrafts[subDrafts.length - 1];

        if (lastSub?.id) {
          previousTaskId = lastSub.id;
        }
      }
    }

    return drafts;
  }

  private assignAgent(
    draft: TaskDraft,
    context: PlanningContext,
  ): TaskDraft {
    if (draft.assignedAgentId) {
      return draft;
    }

    const agents = context.availableAgents ?? [];

    if (agents.length === 0) {
      return draft;
    }

    const required =
      draft.requiredCapabilities ?? [];

    const candidates = agents
      .filter((agent) =>
        this.supports(agent, required),
      )
      .sort(
        (left, right) =>
          (left.load ?? 0) - (right.load ?? 0) ||
          (right.priority ?? 0) -
            (left.priority ?? 0),
      );

    return {
      ...draft,
      assignedAgentId:
        candidates[0]?.id ??
        context.agentId,
    };
  }

  private supports(
    agent: PlanningAgentInfo,
    required: readonly string[],
  ): boolean {
    return (
      agent.capabilities.includes("*") ||
      required.every((capability) =>
        agent.capabilities.includes(capability),
      )
    );
  }

  private matchKnowledge(text: string) {
    const normalized = normalizeText(text);

    return ACTION_KNOWLEDGE.find((entry) =>
      entry.keywords.some((keyword) =>
        normalized.includes(keyword),
      ),
    );
  }

  private inferRiskScore(
    normalized: string,
    explicit?: RiskLevel,
  ): number {
    if (explicit) {
      return riskScoreOf(explicit);
    }

    const hits = HIGH_RISK_KEYWORDS.filter(
      (keyword) => normalized.includes(keyword),
    ).length;

    return clamp(0.12 + hits * 0.28);
  }

  private riskLevelFromScore(
    score: number,
  ): RiskLevel {
    if (score >= 0.85) {
      return RiskLevel.CRITICAL;
    }

    if (score >= 0.6) {
      return RiskLevel.HIGH;
    }

    if (score >= 0.3) {
      return RiskLevel.MODERATE;
    }

    return RiskLevel.LOW;
  }
}

export default TaskPlanner;
