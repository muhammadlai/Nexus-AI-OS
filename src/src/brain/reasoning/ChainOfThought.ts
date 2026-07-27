import { IChainOfThought } from './interfaces';
import { ThoughtStep } from './types';
import { REASONING_DEFAULTS } from './constants';
import { rid, clamp, toClauses } from './utils';

/**
 * Produces an explicit chain of intermediate reasoning steps from an input.
 * Deterministic, dependency-free — suitable as a scaffold for LLM-backed
 * reasoning later without changing the public contract.
 */
export class ChainOfThought implements IChainOfThought {
  constructor(private readonly maxSteps: number = REASONING_DEFAULTS.maxSteps) {}

  public async generate(
    input: string,
    _context: Record<string, unknown> = {},
  ): Promise<ThoughtStep[]> {
    const clauses = toClauses(input).slice(0, this.maxSteps);
    const source = clauses.length > 0 ? clauses : [input];

    return source.map((thought, index) => ({
      id: rid('tht'),
      index,
      thought: `Consider: ${thought}`,
      confidence: clamp(1 - index * 0.08, 0.2, 1),
    }));
  }
}
