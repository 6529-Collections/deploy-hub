import {
  assertOperationTransition,
  type OperationState
} from '../domain/operation-state.js';
import {
  DeterministicClock,
  DeterministicEventIds
} from './deterministic-clock.js';
import { IdempotentMemory } from './idempotent-memory.js';

export const fakeAdapterCapabilities = Object.freeze({
  network: false,
  githubRead: false,
  githubWrite: false,
  workflowDispatch: false,
  environmentMutation: false,
  awsAccess: false,
  realCommunication: false
});

export type FakeScenario =
  | 'success'
  | 'delay'
  | 'product_failure'
  | 'infrastructure_failure'
  | 'cancellation'
  | 'stale';

export interface FakeDispatch {
  readonly dispatchId: string;
  readonly operationId: string;
  readonly scenario: FakeScenario;
  readonly cancellationPoint?: 'waiting' | 'running';
  readonly delayMilliseconds?: number;
}

export interface FakeOperationEvent {
  readonly eventId: string;
  readonly sequence: number;
  readonly state: OperationState;
  readonly occurredAt: string;
}

export interface FakeOperationResult {
  readonly adapterKind:
    'frontend_deployment' | 'backend_deployment' | 'environment_e2e';
  readonly dispatchId: string;
  readonly operationId: string;
  readonly scenario: FakeScenario;
  readonly state: OperationState;
  readonly events: readonly FakeOperationEvent[];
  readonly failure?: {
    readonly class: 'product' | 'infrastructure';
    readonly retryable: boolean;
  };
}

export interface FakeCallback {
  readonly callbackId: string;
  readonly operationId: string;
  readonly state: 'succeeded' | 'failed' | 'cancelled' | 'stale';
  readonly evidence: string;
}

export interface FakeCallbackReceipt {
  readonly callbackId: string;
  readonly receivedAt: string;
}

type FakeAdapterKind = FakeOperationResult['adapterKind'];

class FakeOperationAdapter {
  public readonly capabilities = fakeAdapterCapabilities;

  private readonly callbacks = new IdempotentMemory<
    FakeCallback,
    FakeCallbackReceipt
  >();
  private readonly dispatches = new IdempotentMemory<
    FakeDispatch,
    FakeOperationResult
  >();

  public constructor(
    public readonly kind: FakeAdapterKind,
    private readonly clock: DeterministicClock,
    private readonly eventIds = new DeterministicEventIds()
  ) {}

  public dispatch(input: FakeDispatch): {
    readonly duplicate: boolean;
    readonly result: FakeOperationResult;
  } {
    return this.dispatches.apply(input.dispatchId, input, () =>
      this.execute(input)
    );
  }

  public receiveCallback(input: FakeCallback): {
    readonly duplicate: boolean;
    readonly result: FakeCallbackReceipt;
  } {
    return this.callbacks.apply(input.callbackId, input, () => ({
      callbackId: input.callbackId,
      receivedAt: this.clock.now()
    }));
  }

  public get dispatchCount(): number {
    return this.dispatches.size;
  }

  public get callbackCount(): number {
    return this.callbacks.size;
  }

  private execute(input: FakeDispatch): FakeOperationResult {
    const events: FakeOperationEvent[] = [];
    let state: OperationState = 'accepted';

    const record = (nextState: OperationState): void => {
      assertOperationTransition(state, nextState);
      state = nextState;
      events.push({
        eventId: this.eventIds.next(),
        sequence: events.length + 2,
        state,
        occurredAt: this.clock.now()
      });
    };

    events.push({
      eventId: this.eventIds.next(),
      sequence: 1,
      state,
      occurredAt: this.clock.now()
    });

    const delay = input.delayMilliseconds ?? 30_000;

    switch (input.scenario) {
      case 'success':
        record('dispatched');
        record('running');
        record('succeeded');
        break;
      case 'delay':
        record('waiting');
        this.clock.advance(delay);
        record('dispatched');
        record('running');
        record('succeeded');
        break;
      case 'product_failure':
        record('dispatched');
        record('running');
        record('failed');
        return this.result(input, state, events, {
          class: 'product',
          retryable: false
        });
      case 'infrastructure_failure':
        record('dispatched');
        record('running');
        record('failed');
        return this.result(input, state, events, {
          class: 'infrastructure',
          retryable: true
        });
      case 'cancellation':
        if (input.cancellationPoint === 'running') {
          record('dispatched');
          record('running');
        } else {
          record('waiting');
        }
        record('cancelled');
        break;
      case 'stale':
        record('waiting');
        record('stale');
        break;
    }

    return this.result(input, state, events);
  }

  private result(
    input: FakeDispatch,
    state: OperationState,
    events: readonly FakeOperationEvent[],
    failure?: FakeOperationResult['failure']
  ): FakeOperationResult {
    return {
      adapterKind: this.kind,
      dispatchId: input.dispatchId,
      operationId: input.operationId,
      scenario: input.scenario,
      state,
      events,
      ...(failure === undefined ? {} : { failure })
    };
  }
}

export class FakeFrontendDeploymentAdapter extends FakeOperationAdapter {
  public constructor(clock: DeterministicClock) {
    super('frontend_deployment', clock);
  }
}

export class FakeBackendDeploymentAdapter extends FakeOperationAdapter {
  public constructor(clock: DeterministicClock) {
    super('backend_deployment', clock);
  }
}

export class FakeEnvironmentE2EAdapter extends FakeOperationAdapter {
  public constructor(clock: DeterministicClock) {
    super('environment_e2e', clock);
  }
}
