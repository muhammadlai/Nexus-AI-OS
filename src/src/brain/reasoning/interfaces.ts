import { ProblemDefinition, ReasoningOutput, ThoughtStep, DecisionNode } from './types';

/** Contract for the reasoning engine. */
export interface IReasoningEngine {
  reason(input: string, context?: Record<string, unknown>): Promise<ReasoningOutput>;
}

/** Contract for chain-of-thought generation. */
export interface IChainOfThought {
  generate(input: string, context?: Record<string, unknown>): Promise<ThoughtStep[]>;
}

/** Contract for structured problem solving. */
export interface IProblemSolver {
  solve(problem: ProblemDefinition): Promise<ReasoningOutput>;
}

/** Contract for decision-tree traversal. */
export interface IDecisionTree {
  evaluate(root: DecisionNode, context: Record<string, unknown>): string;
}
