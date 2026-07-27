/**
 * Converts raw user goals into structured, typed goal trees.
 */

import {
  PLANNING_LIMITS,
  URGENCY_KEYWORDS,
} from "./constants.js";

import type { IGoalPlanner } from "./interfaces.js";

import {
  GoalType,
  PlanPriority,
  type Goal,
  type GoalInput,
} from "./types.js";

import {
  assertNonEmpty,
  createUuid,
  normalizeText,
  splitClauses,
} from "./utils.js";

const GOAL_TYPE_KEYWORDS: Readonly<
  Record<GoalType, readonly string[]>
> = {
  [GoalType.TECHNICAL]: [
    "code",
    "api",
    "deploy",
    "debug",
    "database",
    "server",
    "software",
    "app",
  ],
  [GoalType.BUSINESS]: [
    "report",
    "revenue",
    "client",
    "sales",
    "market",
    "proposal",
    "budget",
  ],
  [GoalType.CREATIVE]: [
    "design",
    "write",
    "story",
    "image",
    "logo",
    "video",
    "music",
  ],
  [GoalType.OPERATIONAL]: [
    "schedule",
    "organize",
    "email",
    "file",
    "backup",
    "meeting",
    "reminder",
  ],
  [GoalType.LEARNING]: [
    "learn",
    "study",
    "teach",
    "tutorial",
    "understand",
    "quiz",
  ],
  [GoalType.CUSTOM]: [],
};

export class GoalPlanner implements IGoalPlanner {
  public parseGoal(
    input: string | GoalInput | Goal,
  ): Goal {
    if (typeof input === "string") {
      return this.createGoal({
        description: input,
      });
    }

    if (this.isGoal(input)) {
      return this.rebuildGoal(input, undefined);
    }

    return this.createGoal(input);
  }

  public buildGoalTree(goal: Goal): Goal {
    const clauses = splitClauses(goal.description);

    if (
      clauses.length <= 1 ||
      goal.subGoals.length > 0
    ) {
      return goal;
    }

    const subGoals = clauses
      .slice(1)
      .map((clause) =>
        this.createGoal(
          {
            description: clause.text,
            type: goal.type,
            priority: goal.priority,
          },
          goal.id,
        ),
      );

    return this.rebuildGoal(goal, subGoals);
  }

  public generateMilestones(
    goal: Goal,
  ): readonly Goal[] {
    const tree = this.buildGoalTree(goal);

    if (tree.subGoals.length > 0) {
      return tree.subGoals.map(
        (subGoal, index) =>
          this.createGoal(
            {
              description: `Milestone ${index + 1}: ${subGoal.description}`,
              type: GoalType.OPERATIONAL,
              priority: subGoal.priority,
              successCriteria: [
                subGoal.description,
              ],
            },
            tree.id,
          ),
      );
    }

    return [
      this.createGoal(
        {
          description: `Milestone 1: ${tree.description}`,
          type: GoalType.OPERATIONAL,
          priority: tree.priority,
          successCriteria: [tree.description],
        },
        tree.id,
      ),
    ];
  }

  private createGoal(
    input: GoalInput,
    parentGoalId?: string,
  ): Goal {
    const description = assertNonEmpty(
      input.description,
      "goal.description",
    );

    if (
      description.length >
      PLANNING_LIMITS.maximumDescriptionLength
    ) {
      throw new TypeError(
        "Goal description exceeds the configured limit.",
      );
    }

    const normalized = normalizeText(description);

    return {
      id: createUuid("goal"),
      description,
      type: input.type ?? this.inferType(normalized),
      priority:
        input.priority ??
        this.inferPriority(normalized),
      successCriteria:
        input.successCriteria?.length
          ? [...input.successCriteria]
          : [description],
      constraints: this.extractConstraints(
        normalized,
        input.constraints,
      ),
      subGoals: (input.subGoals ?? [])
        .slice(0, PLANNING_LIMITS.maximumSubGoals)
        .map((subGoal) =>
          this.parseGoal(
            typeof subGoal === "string"
              ? { description: subGoal }
              : subGoal,
          ),
        ),
      parentGoalId,
      deadline: input.deadline,
      metadata: input.metadata,
    };
  }

  private rebuildGoal(
    goal: Goal,
    subGoals: readonly Goal[] | undefined,
  ): Goal {
    return {
      ...goal,
      subGoals: subGoals ?? goal.subGoals,
    };
  }

  private isGoal(
    value: GoalInput | Goal,
  ): value is Goal {
    return (
      typeof (value as Goal).id === "string" &&
      Array.isArray((value as Goal).subGoals) &&
      Array.isArray(
        (value as Goal).successCriteria,
      )
    );
  }

  private inferType(
    normalized: string,
  ): GoalType {
    let bestType = GoalType.CUSTOM;
    let bestScore = 0;

    for (const [type, keywords] of Object.entries(
      GOAL_TYPE_KEYWORDS,
    )) {
      const score = keywords.filter((keyword) =>
        normalized.includes(keyword),
      ).length;

      if (score > bestScore) {
        bestScore = score;
        bestType = type as GoalType;
      }
    }

    return bestScore > 0 ? bestType : GoalType.CUSTOM;
  }

  private inferPriority(
    normalized: string,
  ): PlanPriority {
    if (
      URGENCY_KEYWORDS.some((keyword) =>
        normalized.includes(keyword),
      )
    ) {
      return PlanPriority.HIGH;
    }

    return PlanPriority.MEDIUM;
  }

  private extractConstraints(
    normalized: string,
    explicit?: readonly string[],
  ): readonly string[] {
    const constraints = [...(explicit ?? [])];
    const pattern =
      /\b(?:without|must not|do not|never|avoid)\s+([^.!?\n]{3,80})/gi;

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(normalized)) !== null) {
      const constraint = (match[1] ?? "").trim();

      if (constraint) {
        constraints.push(constraint);
      }
    }

    return [...new Set(constraints)];
  }
}

export default GoalPlanner;
