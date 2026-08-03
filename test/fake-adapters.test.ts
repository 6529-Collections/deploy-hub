import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
  isOperationTransition,
  operationStates,
  operationTransitions,
  type OperationState
} from '../src/domain/operation-state.js';
import { FakeCommunicationSink } from '../src/testing/fake-communication-sink.js';
import {
  FakeBackendDeploymentAdapter,
  FakeEnvironmentE2EAdapter,
  FakeFrontendDeploymentAdapter,
  fakeAdapterCapabilities,
  type FakeDispatch,
  type FakeScenario
} from '../src/testing/fake-operation-adapters.js';
import { DeterministicClock } from '../src/testing/deterministic-clock.js';
import { IdempotencyConflictError } from '../src/testing/idempotent-memory.js';

const scenarios: readonly FakeScenario[] = [
  'success',
  'delay',
  'product_failure',
  'infrastructure_failure',
  'cancellation',
  'stale'
];

const expectedTerminal: Readonly<Record<FakeScenario, OperationState>> = {
  success: 'succeeded',
  delay: 'succeeded',
  product_failure: 'failed',
  infrastructure_failure: 'failed',
  cancellation: 'cancelled',
  stale: 'stale'
};

test('frontend, backend, and E2E fakes support every deterministic scenario', () => {
  const factories = [
    (clock: DeterministicClock) => new FakeFrontendDeploymentAdapter(clock),
    (clock: DeterministicClock) => new FakeBackendDeploymentAdapter(clock),
    (clock: DeterministicClock) => new FakeEnvironmentE2EAdapter(clock)
  ];

  for (const factory of factories) {
    for (const [index, scenario] of scenarios.entries()) {
      const adapter = factory(
        new DeterministicClock('2026-08-03T10:00:00.000Z')
      );
      const result = adapter.dispatch({
        dispatchId: `dispatch-${index}`,
        operationId: `operation-${index}`,
        scenario
      }).result;

      assert.equal(result.state, expectedTerminal[scenario]);
      assert.equal(result.events[0]?.state, 'accepted');
      assert.equal(result.events.at(-1)?.state, expectedTerminal[scenario]);

      for (
        let eventIndex = 1;
        eventIndex < result.events.length;
        eventIndex++
      ) {
        const previous = result.events[eventIndex - 1];
        const current = result.events[eventIndex];
        assert.ok(previous !== undefined && current !== undefined);
        assert.equal(
          isOperationTransition(previous.state, current.state),
          true
        );
      }
    }
  }
});

test('the complete v1 operation state and transition contract is explicit', () => {
  assert.deepEqual(operationStates, [
    'accepted',
    'waiting',
    'dispatched',
    'running',
    'succeeded',
    'failed',
    'cancelled',
    'stale'
  ]);

  const transitions = Object.entries(operationTransitions).flatMap(
    ([from, targets]) => targets.map((to) => `${from}->${to}`)
  );
  assert.deepEqual(transitions, [
    'accepted->waiting',
    'accepted->dispatched',
    'accepted->cancelled',
    'accepted->stale',
    'waiting->dispatched',
    'waiting->cancelled',
    'waiting->stale',
    'dispatched->running',
    'dispatched->failed',
    'dispatched->cancelled',
    'dispatched->stale',
    'running->succeeded',
    'running->failed',
    'running->cancelled',
    'failed->waiting',
    'failed->dispatched',
    'cancelled->waiting',
    'cancelled->dispatched'
  ]);
});

test('delay and retry fixtures reproduce the same events and timestamps', () => {
  const input: FakeDispatch = {
    dispatchId: 'deterministic-dispatch',
    operationId: 'deterministic-operation',
    scenario: 'delay',
    delayMilliseconds: 42_000
  };
  const first = new FakeFrontendDeploymentAdapter(
    new DeterministicClock('2026-08-03T10:00:00.000Z')
  ).dispatch(input).result;
  const second = new FakeFrontendDeploymentAdapter(
    new DeterministicClock('2026-08-03T10:00:00.000Z')
  ).dispatch(input).result;

  assert.deepEqual(first, second);
  assert.equal(first.events[1]?.occurredAt, '2026-08-03T10:00:00.000Z');
  assert.equal(first.events[2]?.occurredAt, '2026-08-03T10:00:42.000Z');
});

test('cancellation can be reconciled before or after dispatch', () => {
  const adapter = new FakeBackendDeploymentAdapter(new DeterministicClock());
  const before = adapter.dispatch({
    dispatchId: 'cancel-before',
    operationId: 'before',
    scenario: 'cancellation'
  }).result;
  const after = adapter.dispatch({
    dispatchId: 'cancel-after',
    operationId: 'after',
    scenario: 'cancellation',
    cancellationPoint: 'running'
  }).result;

  assert.deepEqual(
    before.events.map((event) => event.state),
    ['accepted', 'waiting', 'cancelled']
  );
  assert.deepEqual(
    after.events.map((event) => event.state),
    ['accepted', 'dispatched', 'running', 'cancelled']
  );
});

test('duplicate dispatch and callback delivery are idempotent and conflicts fail closed', () => {
  const adapter = new FakeFrontendDeploymentAdapter(new DeterministicClock());
  const dispatch: FakeDispatch = {
    dispatchId: 'same-dispatch',
    operationId: 'operation',
    scenario: 'success'
  };

  const first = adapter.dispatch(dispatch);
  const duplicate = adapter.dispatch(dispatch);
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.strictEqual(duplicate.result, first.result);
  assert.equal(adapter.dispatchCount, 1);
  assert.throws(
    () => adapter.dispatch({ ...dispatch, scenario: 'stale' }),
    IdempotencyConflictError
  );

  const callback = {
    callbackId: 'same-callback',
    operationId: 'operation',
    state: 'succeeded' as const,
    evidence: 'fake://workflow/1'
  };
  assert.equal(adapter.receiveCallback(callback).duplicate, false);
  assert.equal(adapter.receiveCallback(callback).duplicate, true);
  assert.equal(adapter.callbackCount, 1);
  assert.throws(
    () => adapter.receiveCallback({ ...callback, state: 'failed' }),
    IdempotencyConflictError
  );
});

test('communication sink models non-gating CI and release-note outcomes without posting', () => {
  const sink = new FakeCommunicationSink(
    new DeterministicClock('2026-08-03T10:00:00.000Z')
  );
  const ciAccepted = sink.observe({
    outcomeEventId: 'ci-accepted',
    communicationId: 'ci-1',
    channel: 'ci_drop',
    state: 'accepted'
  });
  const ciFailed = sink.observe({
    outcomeEventId: 'ci-failed',
    communicationId: 'ci-2',
    channel: 'ci_drop',
    state: 'failed'
  });
  const enqueued = sink.observe({
    outcomeEventId: 'rn-enqueued',
    communicationId: 'rn-1',
    channel: 'release_note',
    state: 'enqueued'
  });
  const publishedInput = {
    outcomeEventId: 'rn-published',
    communicationId: 'rn-1',
    channel: 'release_note' as const,
    state: 'published' as const
  };
  const published = sink.observe(publishedInput);
  const skipped = sink.observe({
    outcomeEventId: 'rn-skipped',
    communicationId: 'rn-2',
    channel: 'release_note',
    state: 'skipped'
  });
  const failed = sink.observe({
    outcomeEventId: 'rn-failed',
    communicationId: 'rn-3',
    channel: 'release_note',
    state: 'failed'
  });

  for (const observation of [
    ciAccepted,
    ciFailed,
    enqueued,
    published,
    skipped,
    failed
  ]) {
    assert.equal(observation.result.nonGating, true);
  }
  assert.equal(sink.capabilities.realPosts, false);
  assert.equal(sink.capabilities.realReleaseNotes, false);
  assert.equal(sink.deliveryCount, 6);
  assert.equal(sink.observe(publishedInput).duplicate, true);
  assert.throws(
    () => sink.observe({ ...publishedInput, state: 'failed' }),
    IdempotencyConflictError
  );
});

test('normative terminal fixtures map to the fake contract outcomes', async () => {
  const fixtureNames = [
    'valid-deployment',
    'failed-deployment',
    'stale-deployment',
    'cancelled-deployment'
  ] as const;
  const scenarioByState: Readonly<Record<string, FakeScenario>> = {
    succeeded: 'success',
    failed: 'product_failure',
    stale: 'stale',
    cancelled: 'cancellation'
  };

  for (const fixtureName of fixtureNames) {
    const fixture = JSON.parse(
      await readFile(
        join(
          process.cwd(),
          'docs',
          'contracts',
          'fixtures',
          `${fixtureName}.json`
        ),
        'utf8'
      )
    ) as { readonly terminal_status: { readonly state: OperationState } };
    const scenario = scenarioByState[fixture.terminal_status.state];
    assert.ok(scenario !== undefined);
    const result = new FakeEnvironmentE2EAdapter(
      new DeterministicClock()
    ).dispatch({
      dispatchId: fixtureName,
      operationId: fixtureName,
      scenario
    }).result;
    assert.equal(result.state, fixture.terminal_status.state);
  }
});

test('fake configuration has no live capability', () => {
  assert.deepEqual(Object.values(fakeAdapterCapabilities), [
    false,
    false,
    false,
    false,
    false,
    false,
    false
  ]);
});
