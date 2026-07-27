/**
 * Builds dependency-resolved execution schedules and detects cycles.
 */

import { ActionGraph } from "./ActionGraph.js";
import type { IExecutionPlanner } from "./interfaces.js";

import {
  TaskStatus,
  type ExecutionEdge,
  type ExecutionNode,
  type ExecutionSchedule,
  type GraphEdgeLike,
  type GraphNodeLike,
  type Task,
} from "./types.js";

interface ScheduleNode extends GraphNodeLike {
  readonly task: Task;
}

interface ScheduleEdge extends GraphEdgeLike {
  readonly kind: "dependency";
}

export class ExecutionPlanner implements IExecutionPlanner {
  public buildSchedule(
    tasks: readonly Task[],
    satisfiedTaskIds: ReadonlySet<string> = new Set(),
  ): ExecutionSchedule {
    const graph = this.buildGraph(tasks, satisfiedTaskIds);
    const levels = graph.levels();

    const depthByTask = new Map<string, number>();

    levels.forEach((level, depth) => {
      for (const node of level) {
        depthByTask.set(node.id, depth);
      }
    });

    const criticalPathMs = graph.criticalPathMs(
      (node) => node.task.estimation.durationMs,
    );

    const nodes: ExecutionNode[] = levels.flatMap(
      (level, depth) =>
        level.map((node, index) => ({
          taskId: node.id,
          status: node.task.status,
          depth,
          parallelGroup: index,
          earliestStartOffsetMs:
            this.earliestStart(graph, node.id),
        })),
    );

    const edges: ExecutionEdge[] = graph
      .edges()
      .map((edge) => ({
        from: edge.source,
        to: edge.target,
        kind: "dependency",
      }));

    return {
      levels: levels.map((level) =>
        level.map((node) => node.id),
      ),
      order: graph
        .topologicalSort()
        .map((node) => node.id),
      nodes,
      edges,
      criticalPathMs,
      parallelismDegree: levels.reduce(
        (max, level) => Math.max(max, level.length),
        0,
      ),
    };
  }

  public detectCycles(
    tasks: readonly Task[],
  ): readonly string[] {
    const graph = this.buildGraph(tasks, new Set());

    if (!graph.hasCycle()) {
      return [];
    }

    try {
      graph.topologicalSort();
      return [];
    } catch {
      const scheduled = new Set(
        this.kahnSafe(graph),
      );

      return graph
        .nodes()
        .map((node) => node.id)
        .filter((id) => !scheduled.has(id));
    }
  }

  private buildGraph(
    tasks: readonly Task[],
    satisfiedTaskIds: ReadonlySet<string>,
  ): ActionGraph<ScheduleNode, ScheduleEdge> {
    const taskById = new Map(
      tasks.map((task) => [task.id, task]),
    );

    const graph = new ActionGraph<
      ScheduleNode,
      ScheduleEdge
    >();

    for (const task of tasks) {
      graph.addNode({ id: task.id, task });
    }

    for (const task of tasks) {
      for (const dependency of task.dependencies) {
        if (satisfiedTaskIds.has(dependency.taskId)) {
          continue;
        }

        if (!taskById.has(dependency.taskId)) {
          continue;
        }

        graph.addEdge({
          id: `${dependency.taskId}->${task.id}`,
          source: dependency.taskId,
          target: task.id,
          kind: "dependency",
        });
      }
    }

    return graph;
  }

  private earliestStart(
    graph: ActionGraph<ScheduleNode, ScheduleEdge>,
    taskId: string,
  ): number {
    let start = 0;

    for (const dependency of graph.dependenciesOf(
      taskId,
    )) {
      start = Math.max(
        start,
        this.earliestStart(graph, dependency.id) +
          dependency.task.estimation.durationMs,
      );
    }

    return start;
  }

  private kahnSafe(
    graph: ActionGraph<ScheduleNode, ScheduleEdge>,
  ): readonly string[] {
    try {
      return graph
        .topologicalSort()
        .map((node) => node.id);
    } catch {
      return graph
        .nodes()
        .filter(
          (node) =>
            node.task.status === TaskStatus.COMPLETED,
        )
        .map((node) => node.id);
    }
  }
}

export default ExecutionPlanner;
