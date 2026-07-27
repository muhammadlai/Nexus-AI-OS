/**
 * Builds executable workflow graphs with conditions, loops,
 * error routes and recovery routes.
 */

import type { IWorkflowPlanner } from "./interfaces.js";

import {
  WorkflowEdgeKind,
  WorkflowNodeType,
  type Task,
  type Workflow,
  type WorkflowEdge,
  type WorkflowNode,
} from "./types.js";

import { createUuid } from "./utils.js";

export class WorkflowPlanner implements IWorkflowPlanner {
  public buildWorkflow(
    tasks: readonly Task[],
    planId: string,
  ): Workflow {
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];
    const nodeByTask = new Map<string, string>();

    for (const task of tasks) {
      const condition = this.readString(
        task.metadata,
        "condition",
      );

      if (condition) {
        const conditionNode: WorkflowNode = {
          id: createUuid("wf-condition"),
          type: WorkflowNodeType.CONDITION,
          label: condition,
          condition,
        };

        nodes.push(conditionNode);

        edges.push({
          id: createUuid("wf-edge"),
          source: conditionNode.id,
          target: this.taskNodeId(task, nodes, nodeByTask),
          kind: WorkflowEdgeKind.CONDITION_TRUE,
          condition,
        });

        const falseTarget = this.readString(
          task.metadata,
          "falseBranchTaskId",
        );

        if (falseTarget) {
          edges.push({
            id: createUuid("wf-edge"),
            source: conditionNode.id,
            target: falseTarget,
            kind: WorkflowEdgeKind.CONDITION_FALSE,
            condition,
          });
        }
      } else {
        this
