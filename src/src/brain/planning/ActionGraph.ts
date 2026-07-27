/**
 * Generic directed graph with traversal, cycle detection,
 * topological sorting, layering and critical-path analysis.
 */

import type { IActionGraph } from "./interfaces.js";

import type {
  GraphEdgeLike,
  GraphNodeLike,
} from "./types.js";

import { assertNonEmpty } from "./utils.js";

export class ActionGraph<
  N extends GraphNodeLike,
  E extends GraphEdgeLike,
> implements IActionGraph<N, E>
{
  private readonly nodeMap = new Map<string, N>();
  private readonly edgeMap = new Map<string, E>();
  private readonly outEdges = new Map<string, Set<string>>();
  private readonly inEdges = new Map<string, Set<string>>();

  public constructor(
    nodes: readonly N[] = [],
    edges: readonly E[] = [],
  ) {
    for (const node of nodes) {
      this.addNode(node);
    }

    for (const edge of edges) {
      this.addEdge(edge);
    }
  }

  public addNode(node: N): N {
    const id = assertNonEmpty(node.id, "node.id");

    if (this.nodeMap.has(id)) {
      throw new Error(`Graph node already exists: ${id}`);
    }

    this.nodeMap.set(id, node);
    this.outEdges.set(id, new Set());
    this.inEdges.set(id, new Set());

    return node;
  }

  public addEdge(edge: E): E {
    const id = assertNonEmpty(edge.id, "edge.id");

    if (this.edgeMap.has(id)) {
      throw new Error(`Graph edge already exists: ${id}`);
    }

    if (!this.nodeMap.has(edge.source)) {
      throw new Error(
        `Edge source node does not exist: ${edge.source}`,
      );
    }

    if (!this.nodeMap.has(edge.target)) {
      throw new Error(
        `Edge target node does not exist: ${edge.target}`,
      );
    }

    if (edge.source === edge.target) {
      throw new Error(
        `Self-loop edges are not allowed: ${id}`,
      );
    }

    this.edgeMap.set(id, edge);
    this.outEdges.get(edge.source)?.add(id);
    this.inEdges.get(edge.target)?.add(id);

    return edge;
  }

  public removeNode(nodeId: string): boolean {
    if (!this.nodeMap.has(nodeId)) {
      return false;
    }

    for (const edgeId of [
      ...(this.outEdges.get(nodeId) ?? []),
      ...(this.inEdges.get(nodeId) ?? []),
    ]) {
      this.removeEdge(edgeId);
    }

    this.nodeMap.delete(nodeId);
    this.outEdges.delete(nodeId);
    this.inEdges.delete(nodeId);

    return true;
  }

  public removeEdge(edgeId: string): boolean {
    const edge = this.edgeMap.get(edgeId);

    if (!edge) {
      return false;
    }

    this.outEdges.get(edge.source)?.delete(edgeId);
    this.inEdges.get(edge.target)?.delete(edgeId);
    this.edgeMap.delete(edgeId);

    return true;
  }

  public getNode(nodeId: string): N | undefined {
    return this.nodeMap.get(nodeId);
  }

  public getEdge(edgeId: string): E | undefined {
    return this.edgeMap.get(edgeId);
  }

  public hasNode(nodeId: string): boolean {
    return this.nodeMap.has(nodeId);
  }

  public get nodeCount(): number {
    return this.nodeMap.size;
  }

  public get edgeCount(): number {
    return this.edgeMap.size;
  }

  public nodes(): readonly N[] {
    return [...this.nodeMap.values()];
  }

  public edges(): readonly E[] {
    return [...this.edgeMap.values()];
  }

  public dependenciesOf(nodeId: string): readonly N[] {
    return [...(this.inEdges.get(nodeId) ?? [])]
      .map((edgeId) => this.edgeMap.get(edgeId))
      .filter(
        (edge): edge is E =>
          edge !== undefined &&
          this.nodeMap.has(edge.source),
      )
      .map((edge) => this.nodeMap.get(edge.source) as N);
  }

  public dependentsOf(nodeId: string): readonly N[] {
    return [...(this.outEdges.get(nodeId) ?? [])]
      .map((edgeId) => this.edgeMap.get(edgeId))
      .filter(
        (edge): edge is E =>
          edge !== undefined &&
          this.nodeMap.has(edge.target),
      )
      .map((edge) => this.nodeMap.get(edge.target) as N);
  }

  public bfs(
    startIds: readonly string[],
    direction: "out" | "in" | "both" = "out",
  ): readonly N[] {
    const visited = new Set<string>();
    const queue = [...startIds];
    const output: N[] = [];

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId || visited.has(currentId)) {
        continue;
      }

      visited.add(currentId);

      const node = this.nodeMap.get(currentId);

      if (!node) {
        continue;
      }

      output.push(node);

      for (const neighbor of this.neighbors(
        currentId,
        direction,
      )) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    return output;
  }

  public dfs(
    startIds: readonly string[],
    direction: "out" | "in" | "both" = "out",
  ): readonly N[] {
    const visited = new Set<string>();
    const output: N[] = [];

    const visit = (nodeId: string): void => {
      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);

      const node = this.nodeMap.get(nodeId);

      if (!node) {
        return;
      }

      output.push(node);

      for (const neighbor of this.neighbors(
        nodeId,
        direction,
      )) {
        visit(neighbor);
      }
    };

    for (const startId of startIds) {
      visit(startId);
    }

    return output;
  }

  public hasCycle(): boolean {
    return this.kahn().remaining.length > 0;
  }

  public topologicalSort(): readonly N[] {
    const { ordered, remaining } = this.kahn();

    if (remaining.length > 0) {
      throw new Error(
        `Graph contains a dependency cycle involving: ${remaining.join(
          ", ",
        )}`,
      );
    }

    return ordered.map(
      (id) => this.nodeMap.get(id) as N,
    );
  }

  public levels(): readonly (readonly N[])[] {
    const { ordered, remaining } = this.kahn();

    if (remaining.length > 0) {
      throw new Error(
        `Cannot layer a cyclic graph. Cycle nodes: ${remaining.join(
          ", ",
        )}`,
      );
    }

    const depth = new Map<string, number>();

    for (const nodeId of ordered) {
      let level = 0;

      for (const dependency of this.dependenciesOf(
        nodeId,
      )) {
        level = Math.max(
          level,
          (depth.get(dependency.id) ?? 0) + 1,
        );
      }

      depth.set(nodeId, level);
    }

    const grouped = new Map<number, N[]>();

    for (const [nodeId, level] of depth) {
      const bucket = grouped.get(level) ?? [];
      bucket.push(this.nodeMap.get(nodeId) as N);
      grouped.set(level, bucket);
    }

    return [...grouped.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([, nodes]) => nodes);
  }

  public criticalPathMs(
    weightOf: (node: N) => number,
  ): number {
    const { ordered, remaining } = this.kahn();

    if (remaining.length > 0) {
      throw new Error(
        "Critical path requires an acyclic graph.",
      );
    }

    const earliestFinish = new Map<string, number>();

    for (const nodeId of ordered) {
      const node = this.nodeMap.get(nodeId) as N;
      let earliestStart = 0;

      for (const dependency of this.dependenciesOf(
        nodeId,
      )) {
        earliestStart = Math.max(
          earliestStart,
          earliestFinish.get(dependency.id) ?? 0,
        );
      }

      earliestFinish.set(
        nodeId,
        earliestStart + Math.max(0, weightOf(node)),
      );
    }

    return Math.max(0, ...earliestFinish.values());
  }

  /**
   * Returns the minimal edge set preserving reachability.
   */
  public transitiveReduction(): readonly E[] {
    const keep = new Set<string>(
      this.edgeMap.keys(),
    );

    for (const edge of this.edgeMap.values()) {
      if (!keep.has(edge.id)) {
        continue;
      }

      const indirect = this.bfs(
        this.neighbors(edge.source, "out").filter(
          (id) => id !== edge.target,
        ),
        "out",
      ).some((node) => node.id === edge.target);

      if (indirect) {
        keep.delete(edge.id);
      }
    }

    return this.edges().filter((edge) =>
      keep.has(edge.id),
    );
  }

  private neighbors(
    nodeId: string,
    direction: "out" | "in" | "both",
  ): string[] {
    const output: string[] = [];

    if (direction !== "in") {
      for (const edgeId of this.outEdges.get(nodeId) ?? []) {
        const edge = this.edgeMap.get(edgeId);

        if (edge) {
          output.push(edge.target);
        }
      }
    }

    if (direction !== "out") {
      for (const edgeId of this.inEdges.get(nodeId) ?? []) {
        const edge = this.edgeMap.get(edgeId);

        if (edge) {
          output.push(edge.source);
        }
      }
    }

    return output;
  }

  private kahn(): {
    ordered: string[];
    remaining: string[];
  } {
    const inDegree = new Map<string, number>();

    for (const nodeId of this.nodeMap.keys()) {
      inDegree.set(
        nodeId,
        this.inEdges.get(nodeId)?.size ?? 0,
      );
    }

    const queue = [...this.nodeMap.keys()].filter(
      (nodeId) => (inDegree.get(nodeId) ?? 0) === 0,
    );

    const ordered: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift() as string;
      ordered.push(nodeId);

      for (const edgeId of this.outEdges.get(nodeId) ?? []) {
        const edge = this.edgeMap.get(edgeId);

        if (!edge) {
          continue;
        }

        const next =
          (inDegree.get(edge.target) ?? 0) - 1;

        inDegree.set(edge.target, next);

        if (next === 0) {
          queue.push(edge.target);
        }
      }
    }

    const remaining = [...this.nodeMap.keys()].filter(
      (nodeId) => !ordered.includes(nodeId),
    );

    return { ordered, remaining };
  }
}

export default ActionGraph;
