import { IDecisionTree } from './interfaces';
import { DecisionNode } from './types';

/**
 * Traverses a binary decision tree by evaluating node conditions against
 * a runtime context, returning the resolved outcome.
 */
export class DecisionTree implements IDecisionTree {
  public evaluate(root: DecisionNode, context: Record<string, unknown>): string {
    let node: DecisionNode | undefined = root;

    while (node) {
      if (node.outcome !== undefined) return node.outcome;
      if (!node.condition) return 'undecided';
      node = node.condition(context) ? node.yes : node.no;
    }
    return 'undecided';
  }
}
