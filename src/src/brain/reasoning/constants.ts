/** Reasoning subsystem constants. */
export const REASONING_DEFAULTS = {
  maxSteps: 12,
  minConfidence: 0.35,
  maxBranches: 5,
} as const;

export const REASONING_STRATEGIES = [
  'deductive',
  'inductive',
  'abductive',
  'analogical',
] as const;
