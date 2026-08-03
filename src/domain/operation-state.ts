export const operationStates = [
  'accepted',
  'waiting',
  'dispatched',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'stale'
] as const;

export type OperationState = (typeof operationStates)[number];

export const operationTransitions = Object.freeze({
  accepted: ['waiting', 'dispatched', 'cancelled', 'stale'],
  waiting: ['dispatched', 'cancelled', 'stale'],
  dispatched: ['running', 'failed', 'cancelled', 'stale'],
  running: ['succeeded', 'failed', 'cancelled'],
  succeeded: [],
  failed: ['waiting', 'dispatched'],
  cancelled: ['waiting', 'dispatched'],
  stale: []
} satisfies Readonly<Record<OperationState, readonly OperationState[]>>);

export function isOperationTransition(
  from: OperationState,
  to: OperationState
): boolean {
  return operationTransitions[from].some((candidate) => candidate === to);
}

export function assertOperationTransition(
  from: OperationState,
  to: OperationState
): void {
  if (!isOperationTransition(from, to)) {
    throw new Error(`Invalid operation transition: ${from} -> ${to}`);
  }
}
