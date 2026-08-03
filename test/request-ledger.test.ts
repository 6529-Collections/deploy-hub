import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import {
  cloneJson,
  parseJsonObject,
  type JsonObject
} from '../src/ledger/canonical-json.js';
import {
  LedgerConflictError,
  RequestIdConflictError,
  RequestLedger,
  type GitHubReconciliationEvidence,
  type LedgerRuntime
} from '../src/ledger/request-ledger.js';
import { DeterministicClock } from '../src/testing/deterministic-clock.js';
import { InMemoryGitLedgerRepository } from '../src/testing/in-memory-git-ledger-repository.js';

const DEPLOYMENT_ID = '11111111-1111-4111-8111-111111111111';
const VALIDATION_ID = '22222222-2222-4222-8222-222222222222';
const SOURCE_SHA = '1111111111111111111111111111111111111111';

test('identical deployment intent replays once and conflicting reuse fails closed', async () => {
  const repository = new InMemoryGitLedgerRepository();
  const ledger = createLedger(repository);
  const request = await deploymentRequest();
  const accepted = ledger.acceptDeployment(request);
  const replayRequest = cloneJson(request);
  replayRequest.accepted_at = '2099-01-01T00:00:00.000Z';
  replayRequest.acceptance_sequence = 999;
  const authority = objectAt(replayRequest, 'authority');
  authority.authenticated_at = '2099-01-01T00:00:00.000Z';
  const source = objectAt(replayRequest, 'source');
  source.resolved_at = '2099-01-01T00:00:00.000Z';

  const replay = ledger.acceptDeployment(replayRequest);
  assert.equal(accepted.replay, false);
  assert.equal(replay.replay, true);
  assert.equal(replay.digest, accepted.digest);
  assert.deepEqual(replay.request, accepted.request);
  assert.equal(repository.history().length, 1);

  const conflict = cloneJson(request);
  objectAt(conflict, 'source').sha = '9999999999999999999999999999999999999999';
  assert.throws(
    () => ledger.acceptDeployment(conflict),
    RequestIdConflictError
  );
  assert.equal(repository.history().length, 1);
});

test('validation identity is idempotent and its accepted snapshot is immutable', async () => {
  const repository = new InMemoryGitLedgerRepository();
  const ledger = createLedger(repository);
  const request = await validationRequest();
  const accepted = ledger.acceptValidation(request);
  assert.equal(ledger.acceptValidation(request).replay, true);

  const changed = cloneJson(request);
  objectAt(changed, 'snapshot_before').digest =
    'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';
  assert.throws(() => ledger.acceptValidation(changed), RequestIdConflictError);
  assert.equal(
    objectAt(accepted.request, 'snapshot_before').digest,
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  );
});

test('waiting order and ownership survive a process restart', async () => {
  const repository = new InMemoryGitLedgerRepository();
  const firstLedger = createLedger(repository);
  const first = await deploymentRequest();
  const second = cloneJson(first);
  second.request_id = '33333333-3333-4333-8333-333333333333';

  firstLedger.acceptDeployment(first);
  firstLedger.acceptDeployment(second);
  firstLedger.markWaiting('deployment', DEPLOYMENT_ID);
  firstLedger.markWaiting(
    'deployment',
    '33333333-3333-4333-8333-333333333333',
    [DEPLOYMENT_ID]
  );

  const restarted = createLedger(repository);
  const queue = restarted.waitingQueue('staging:frontend:web');
  assert.deepEqual(
    queue.map((entry) => [entry.id, entry.acceptanceSequence, entry.owner]),
    [
      [DEPLOYMENT_ID, 1, true],
      ['33333333-3333-4333-8333-333333333333', 2, false]
    ]
  );
  assert.equal(restarted.reconstruct().length, 2);
});

test('compare-and-swap conflict is reread without duplicate acceptance', async () => {
  const repository = new InMemoryGitLedgerRepository();
  repository.injectConflicts();
  const ledger = createLedger(repository);
  const accepted = ledger.acceptDeployment(await deploymentRequest());

  assert.equal(accepted.replay, false);
  assert.equal(repository.metrics.conflicts, 1);
  assert.equal(repository.metrics.compareAndSwaps, 2);
  assert.equal(ledger.reconstruct().length, 1);
});

test('accepted deployment SHA never follows a moved branch or conflicting evidence', async () => {
  const repository = new InMemoryGitLedgerRepository();
  const ledger = createLedger(repository);
  ledger.acceptDeployment(await deploymentRequest());
  const historyBefore = repository.history().length;

  assert.throws(
    () =>
      ledger.reconcile({
        ...successfulDeploymentEvidence(),
        sourceSha: '9999999999999999999999999999999999999999'
      }),
    /cannot replace the accepted source SHA/
  );
  assert.equal(repository.history().length, historyBefore);
  assert.equal(
    objectAt(ledger.get('deployment', DEPLOYMENT_ID)!.request, 'source').sha,
    SOURCE_SHA
  );
});

test('restart reconciliation rebuilds terminal state from exact GitHub evidence once', async () => {
  const repository = new InMemoryGitLedgerRepository();
  createLedger(repository).acceptDeployment(await deploymentRequest());

  const restarted = createLedger(repository);
  const evidence = successfulDeploymentEvidence();
  const reconciled = restarted.reconcile(evidence);
  assert.equal(reconciled.snapshot.state, 'succeeded');
  assert.equal(
    objectAt(reconciled.snapshot, 'runtime_proof').source_sha,
    SOURCE_SHA
  );
  assert.equal(
    objectAt(reconciled.snapshot, 'validation').validation_id,
    VALIDATION_ID
  );
  const commitsAfterSuccess = repository.history().length;

  assert.equal(restarted.reconcile(evidence).snapshot.state, 'succeeded');
  assert.equal(repository.history().length, commitsAfterSuccess);
  assert.equal(createLedger(repository).reconstruct().length, 1);

  assert.throws(
    () =>
      restarted.reconcile({
        ...evidence,
        state: 'failed',
        failure: {
          code: 'WORKFLOW_FAILED',
          class: 'infrastructure',
          message: 'Conflicting callback.',
          retryable: true
        }
      }),
    RequestIdConflictError
  );
});

test('validation reconciliation rejects snapshot drift and replays exact success', async () => {
  const repository = new InMemoryGitLedgerRepository();
  createLedger(repository).acceptValidation(await validationRequest());
  const restarted = createLedger(repository);
  const workflow = {
    repository: '6529-Collections/6529seize-frontend',
    workflow_path: '.github/workflows/staging-e2e.yml',
    run_id: 9010,
    run_attempt: 1,
    sha: SOURCE_SHA,
    url: 'https://github.com/6529-Collections/6529seize-frontend/actions/runs/9010'
  } satisfies JsonObject;

  assert.throws(
    () =>
      restarted.reconcile({
        evidenceId: 'validation-drift',
        subjectKind: 'validation',
        subjectId: VALIDATION_ID,
        state: 'succeeded',
        evidenceUrl: workflow.url as string,
        snapshotDigest:
          'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        workflow
      }),
    /cannot replace the accepted environment snapshot/
  );

  const reconciled = restarted.reconcile({
    evidenceId: 'validation-success',
    subjectKind: 'validation',
    subjectId: VALIDATION_ID,
    state: 'succeeded',
    evidenceUrl: workflow.url as string,
    snapshotDigest:
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    workflow,
    environmentMutated: false,
    runtimeVerified: false,
    validationSucceeded: true
  });
  assert.equal(reconciled.snapshot.state, 'succeeded');
  assert.deepEqual(
    reconciled.snapshot.snapshot_after,
    objectAt(reconciled.request, 'snapshot_before')
  );
  assert.equal(createLedger(repository).reconstruct().length, 1);
});

test('requests and events are append-only while snapshots remain replayable caches', async () => {
  const repository = new InMemoryGitLedgerRepository();
  const ledger = createLedger(repository);
  ledger.acceptDeployment(await deploymentRequest());
  ledger.markWaiting('deployment', DEPLOYMENT_ID);
  ledger.reconcile({
    ...successfulDeploymentEvidence(),
    state: 'cancelled',
    cancelReason: 'Cancelled by the owning task.',
    environmentMutated: false,
    runtimeVerified: false,
    validationSucceeded: false
  });

  const immutableFiles = new Map<string, string>();
  for (const commit of repository.history()) {
    for (const [path, contents] of commit.files) {
      if (!path.endsWith('/request.json') && !path.includes('/events/')) {
        continue;
      }
      const previous = immutableFiles.get(path);
      if (previous === undefined) {
        immutableFiles.set(path, contents);
      } else {
        assert.equal(contents, previous);
      }
    }
    for (const path of immutableFiles.keys()) {
      assert.equal(commit.files.has(path), true);
    }
  }
  assert.equal(
    [...immutableFiles.keys()].filter((path) => path.includes('/events/'))
      .length,
    3
  );
  assert.equal(ledger.reconstruct()[0]?.snapshot.state, 'cancelled');
});

test('head size and repository operations grow linearly with accepted subjects', async () => {
  const repository = new InMemoryGitLedgerRepository();
  const ledger = createLedger(repository);
  const template = await deploymentRequest();

  for (let index = 1; index <= 50; index++) {
    const request = cloneJson(template);
    request.request_id = `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
    ledger.acceptDeployment(request);
  }

  const head = repository.readHead();
  assert.equal(head.files.size, 151);
  assert.equal(repository.metrics.compareAndSwaps, 50);
  assert.equal(repository.metrics.conflicts, 0);
  assert.ok(repository.headBytes < 500_000);

  const writesBeforeReplay = repository.metrics.compareAndSwaps;
  const replay = cloneJson(template);
  replay.request_id = '10000000-0000-4000-8000-000000000001';
  assert.equal(ledger.acceptDeployment(replay).replay, true);
  assert.equal(repository.metrics.compareAndSwaps, writesBeforeReplay);
});

test('reconstruction fails closed when an external writer tampers with a snapshot', async () => {
  const repository = new InMemoryGitLedgerRepository();
  const ledger = createLedger(repository);
  ledger.acceptDeployment(await deploymentRequest());
  const head = repository.readHead();
  const files = new Map(head.files);
  const snapshotPath = `ledger/v1/deployments/${DEPLOYMENT_ID}/snapshot.json`;
  const snapshot = parseJsonObject(files.get(snapshotPath)!);
  snapshot.state = 'succeeded';
  files.set(snapshotPath, JSON.stringify(snapshot));
  assert.ok(
    repository.compareAndSwap(
      head.sha,
      files,
      'simulate forbidden snapshot edit'
    )
  );

  assert.throws(
    () => createLedger(repository).reconstruct(),
    LedgerConflictError
  );
});

function createLedger(repository: InMemoryGitLedgerRepository): RequestLedger {
  const clock = new DeterministicClock('2026-08-03T10:00:00.000Z');
  const runtime: LedgerRuntime = {
    now: () => clock.now()
  };
  return new RequestLedger(repository, runtime);
}

function successfulDeploymentEvidence(): GitHubReconciliationEvidence {
  return {
    evidenceId: 'workflow-run-9003',
    subjectKind: 'deployment',
    subjectId: DEPLOYMENT_ID,
    state: 'succeeded',
    evidenceUrl:
      'https://github.com/6529-Collections/6529seize-frontend/actions/runs/9003',
    sourceSha: SOURCE_SHA,
    validationId: VALIDATION_ID,
    environmentMutated: true,
    runtimeVerified: true,
    validationSucceeded: true
  };
}

async function deploymentRequest(): Promise<JsonObject> {
  const fixture = await fixtureObject('valid-deployment.json');
  return cloneJson(objectAt(fixture, 'request'));
}

async function validationRequest(): Promise<JsonObject> {
  const fixture = await fixtureObject('valid-validation.json');
  return cloneJson(objectAt(fixture, 'request'));
}

async function fixtureObject(name: string): Promise<JsonObject> {
  return parseJsonObject(
    await readFile(
      join(process.cwd(), 'docs', 'contracts', 'fixtures', name),
      'utf8'
    )
  );
}

function objectAt(object: JsonObject, key: string): JsonObject {
  const value = object[key];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${key} is not an object.`);
  }
  return value;
}
