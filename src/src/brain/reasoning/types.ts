import { REASONING_STRATEGIES } from './constants';

/** Available reasoning strategies. */
export type ReasoningStrategy = (typeof REASONING_STRATEGIES)[number];

/** A single reasoning step in a chain. */
export interface ThoughtStep {
  id: string;
  index: number;
  thought: string;
  confidence: number;
}

/** Result of a reasoning pass. */
export interface ReasoningOutput {
  answer: string;
  rationale: string;
  confidence: number;
  strategy: ReasoningStrategy;
  steps: ThoughtStep[];
  metadata?: Record<string, unknown>;
}

/** A node in a decision tree. */
export interface DecisionNode {
  id: string;
  condition?: (ctx: Record<string, unknown>) => boolean;
  outcome?: string;
  yes?: DecisionNode;
  no?: DecisionNode;
}

/** A structured problem definition. */
export interface ProblemDefinition {
  goal: string;
  constraints?: string[];
  facts?: string[];
  context?: Record<string, unknown>;
}
