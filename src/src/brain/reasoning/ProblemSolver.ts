import { IProblemSolver, IChainOfThought } from './interfaces';
import { ProblemDefinition, ReasoningOutput } from './types';
import { ChainOfThought } from './ChainOfThought';
import { average, rid } from './utils';

/**
 * Decomposes a structured problem into reasoning steps and synthesizes a
 * conclusion. Uses dependency injection for the chain-of-thought generator.
 */
export class ProblemSolver implements IProblemSolver {
  constructor(private readonly cot: IChainOfThought = new ChainOfThought()) {}

  public async solve(problem: ProblemDefinition): Promise<ReasoningOutput> {
    const seed = [
      problem.goal,
      ...(problem.facts ?? []),
      ...(problem.constraints ?? []),
    ].join('. ');

    const steps = await this.cot.generate(seed, problem.context ?? {});
    const confidence = average(steps.map((s) => s.confidence));

    return {
      answer: `Proposed approach to achieve: ${problem.goal}`,
      rationale: steps.map((s) => s.thought).join(' → '),
      confidence,
      strategy: 'deductive',
      steps,
      metadata: { problemId: rid('prb'), constraints: problem.constraints ?? [] },
    };
  }
}
