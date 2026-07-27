import { IReasoningEngine, IChainOfThought, IProblemSolver } from './interfaces';
import { ReasoningOutput, ReasoningStrategy } from './types';
import { ChainOfThought } from './ChainOfThought';
import { ProblemSolver } from './ProblemSolver';
import { REASONING_DEFAULTS } from './constants';
import { average } from './utils';

/** Dependencies injectable into the reasoning engine. */
export interface ReasoningEngineDeps {
  chainOfThought?: IChainOfThought;
  problemSolver?: IProblemSolver;
  strategy?: ReasoningStrategy;
}

/**
 * Central reasoning engine. Generates a chain of thought, evaluates
 * confidence, and produces a structured, explainable conclusion.
 *
 * Compatible with BrainCore's IReasoningEngine (reason -> { answer, ... }).
 */
export class ReasoningEngine implements IReasoningEngine {
  private readonly cot: IChainOfThought;
  private readonly solver: IProblemSolver;
  private readonly strategy: ReasoningStrategy;

  constructor(deps: ReasoningEngineDeps = {}) {
    this.cot = deps.chainOfThought ?? new ChainOfThought();
    this.solver = deps.problemSolver ?? new ProblemSolver(this.cot);
    this.strategy = deps.strategy ?? 'deductive';
  }

  public async reason(
    input: string,
    context: Record<string, unknown> = {},
  ): Promise<ReasoningOutput> {
    const steps = await this.cot.generate(input, context);
    const confidence = average(steps.map((s) => s.confidence));

    const answer =
      confidence < REASONING_DEFAULTS.minConfidence
        ? `I need more information to reason confidently about: "${input}".`
        : `Based on analysis, the reasoned conclusion for "${input}" has been derived.`;

    return {
      answer,
      rationale: steps.map((s) => s.thought).join(' → '),
      confidence,
      strategy: this.strategy,
      steps,
      metadata: { contextKeys: Object.keys(context) },
    };
  }
}
