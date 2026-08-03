import {
  assertOperationTransition,
  type OperationState
} from '../domain/operation-state.js';
import {
  canonicalJson,
  cloneJson,
  isJsonObject,
  jsonDigest,
  parseJsonObject,
  type JsonObject,
  type JsonValue
} from './canonical-json.js';
import type { GitLedgerRepository } from './git-ledger-repository.js';

export type LedgerSubjectKind = 'deployment' | 'validation';

export interface LedgerRuntime {
  now(): string;
}

export interface LedgerRecord {
  readonly kind: LedgerSubjectKind;
  readonly id: string;
  readonly digest: string;
  readonly request: JsonObject;
  readonly snapshot: JsonObject;
}

export interface LedgerAcceptance extends LedgerRecord {
  readonly replay: boolean;
  readonly commitSha: string;
}

export interface WaitingEntry {
  readonly kind: LedgerSubjectKind;
  readonly id: string;
  readonly acceptanceSequence: number;
  readonly orderKey: string;
  readonly owner: boolean;
}

export interface ReconciliationFailure {
  readonly code: string;
  readonly class:
    | 'validation'
    | 'authorization'
    | 'stale_source'
    | 'infrastructure'
    | 'build'
    | 'mutation'
    | 'runtime_proof'
    | 'product_e2e'
    | 'environment_drift'
    | 'cancel'
    | 'reconciliation'
    | 'communication';
  readonly message: string;
  readonly retryable: boolean;
  readonly detailsUrl?: string;
}

export interface GitHubReconciliationEvidence {
  readonly evidenceId: string;
  readonly subjectKind: LedgerSubjectKind;
  readonly subjectId: string;
  readonly state:
    'dispatched' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'stale';
  readonly evidenceUrl: string;
  readonly sourceSha?: string;
  readonly snapshotDigest?: string;
  readonly validationId?: string;
  readonly workflow?: JsonObject;
  readonly environmentMutated?: boolean;
  readonly runtimeVerified?: boolean;
  readonly validationSucceeded?: boolean;
  readonly cancelReason?: string;
  readonly failure?: ReconciliationFailure;
}

export class RequestIdConflictError extends Error {
  public readonly code = 'IDEMPOTENCY_CONFLICT';

  public constructor(id: string) {
    super(`IDEMPOTENCY_CONFLICT: ${id}`);
    this.name = 'RequestIdConflictError';
  }
}

export class LedgerConflictError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'LedgerConflictError';
  }
}

interface LedgerMeta extends JsonObject {
  schema_version: 'deploy-hub.ledger-meta.v1';
  ledger_sequence: number;
  last_acceptance_sequence: number;
  created_at: string;
  updated_at: string;
}

const META_PATH = 'ledger/v1/meta.json';
const MAX_WRITE_ATTEMPTS = 3;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const TERMINAL_STATES = new Set<OperationState>([
  'succeeded',
  'failed',
  'cancelled',
  'stale'
]);

export class RequestLedger {
  public constructor(
    private readonly repository: GitLedgerRepository,
    private readonly runtime: LedgerRuntime,
    private readonly maxWriteAttempts = MAX_WRITE_ATTEMPTS
  ) {
    if (!Number.isSafeInteger(maxWriteAttempts) || maxWriteAttempts < 1) {
      throw new Error('maxWriteAttempts must be a positive integer.');
    }
  }

  public acceptDeployment(request: JsonObject): LedgerAcceptance {
    return this.accept('deployment', request);
  }

  public acceptValidation(request: JsonObject): LedgerAcceptance {
    return this.accept('validation', request);
  }

  public get(kind: LedgerSubjectKind, id: string): LedgerRecord | undefined {
    const head = this.repository.readHead();
    return this.readRecord(head.files, kind, id);
  }

  public markWaiting(
    kind: LedgerSubjectKind,
    id: string,
    blockedBy: readonly string[] = []
  ): LedgerRecord {
    return this.appendState(kind, id, 'waiting', 'waiting', {
      resource_keys: this.resourceKeys(
        this.requiredRecord(this.repository.readHead().files, kind, id).request,
        kind
      ),
      blocked_by: [...blockedBy]
    });
  }

  public waitingQueue(resourceKey: string): readonly WaitingEntry[] {
    const head = this.repository.readHead();
    const waiting = this.listRecords(head.files)
      .filter((record) => readString(record.snapshot, 'state') === 'waiting')
      .filter((record) =>
        this.resourceKeys(record.request, record.kind).includes(resourceKey)
      )
      .map((record) => {
        const acceptanceSequence = readInteger(
          record.request,
          'acceptance_sequence'
        );
        return {
          kind: record.kind,
          id: record.id,
          acceptanceSequence,
          orderKey: orderKey(acceptanceSequence, record.id)
        };
      })
      .sort((left, right) => left.orderKey.localeCompare(right.orderKey));

    return waiting.map((entry, index) => ({ ...entry, owner: index === 0 }));
  }

  public reconcile(evidence: GitHubReconciliationEvidence): LedgerRecord {
    const evidenceDigest = jsonDigest(evidenceToJson(evidence));
    this.assertEvidenceIdentity(evidence, evidenceDigest);
    this.assertImmutableEvidence(evidence);

    for (;;) {
      const current = this.requiredRecord(
        this.repository.readHead().files,
        evidence.subjectKind,
        evidence.subjectId
      );
      const currentState = readOperationState(current.snapshot, 'state');
      if (currentState === evidence.state) {
        return current;
      }
      if (TERMINAL_STATES.has(currentState)) {
        throw new LedgerConflictError(
          `Terminal state conflict: ${currentState} != ${evidence.state}`
        );
      }

      const nextState = nextReconciledState(currentState, evidence);
      const terminal = TERMINAL_STATES.has(nextState);
      const payload: JsonObject = {
        code: 'GITHUB_EVIDENCE_DIGEST',
        message: evidenceDigest,
        evidence_url: evidence.evidenceUrl,
        ...(evidence.sourceSha === undefined
          ? {}
          : { source_sha: evidence.sourceSha }),
        ...(evidence.snapshotDigest === undefined
          ? {}
          : { snapshot_digest: evidence.snapshotDigest }),
        ...(evidence.validationId === undefined
          ? {}
          : { validation_id: evidence.validationId }),
        ...(evidence.workflow === undefined
          ? {}
          : { workflow: evidence.workflow }),
        ...(evidence.cancelReason === undefined
          ? {}
          : { reason: evidence.cancelReason }),
        ...(terminal
          ? { terminal_result: terminalResult(evidence, nextState) }
          : {})
      };

      this.appendState(
        evidence.subjectKind,
        evidence.subjectId,
        nextState,
        'reconciled',
        payload,
        [
          {
            kind: 'workflow_run',
            url: evidence.evidenceUrl,
            external_id: evidence.evidenceId
          }
        ],
        'reconciler'
      );
    }
  }

  public reconstruct(): readonly LedgerRecord[] {
    const head = this.repository.readHead();
    const records = this.listRecords(head.files);
    const allEvents: JsonObject[] = [];

    for (const record of records) {
      const expectedDigest = requestDigest(record.kind, record.request);
      if (expectedDigest !== record.digest) {
        throw new LedgerConflictError(`Request digest mismatch: ${record.id}`);
      }

      const events = this.eventsFor(head.files, record.kind, record.id);
      validateEventSequence(events, record);
      const rebuilt = replaySnapshot(record.kind, record.request, events);
      if (canonicalJson(rebuilt) !== canonicalJson(record.snapshot)) {
        throw new LedgerConflictError(`Snapshot replay mismatch: ${record.id}`);
      }
      allEvents.push(...events);
    }

    allEvents.sort(
      (left, right) =>
        readInteger(left, 'ledger_sequence') -
        readInteger(right, 'ledger_sequence')
    );
    const eventIds = new Set<string>();
    for (const [index, event] of allEvents.entries()) {
      if (readInteger(event, 'ledger_sequence') !== index + 1) {
        throw new LedgerConflictError(
          'Global ledger sequence is not contiguous.'
        );
      }
      const eventId = readString(event, 'event_id');
      if (eventIds.has(eventId)) {
        throw new LedgerConflictError('Ledger event ID is not unique.');
      }
      eventIds.add(eventId);
    }

    if (allEvents.length > 0) {
      const meta = this.readMeta(head.files);
      if (meta.ledger_sequence !== allEvents.length) {
        throw new LedgerConflictError('Ledger metadata does not match events.');
      }
    }

    return records;
  }

  private accept(
    kind: LedgerSubjectKind,
    submittedRequest: JsonObject
  ): LedgerAcceptance {
    const id = subjectId(kind, submittedRequest);
    assertUuid(id);
    this.resourceKeys(submittedRequest, kind);
    if (kind === 'deployment') {
      assertSha(sourceSha(submittedRequest));
    }
    const submittedDigest = requestDigest(kind, submittedRequest);

    for (let attempt = 1; attempt <= this.maxWriteAttempts; attempt++) {
      const head = this.repository.readHead();
      const existing = this.readRecord(head.files, kind, id);
      if (existing !== undefined) {
        if (existing.digest !== submittedDigest) {
          throw new RequestIdConflictError(id);
        }
        return {
          ...existing,
          replay: true,
          commitSha: head.sha ?? ''
        };
      }

      const now = this.runtime.now();
      const currentMeta = this.readMeta(head.files, now);
      const acceptanceSequence = currentMeta.last_acceptance_sequence + 1;
      const ledgerSequence = currentMeta.ledger_sequence + 1;
      const request = cloneJson(submittedRequest);
      request.acceptance_sequence = acceptanceSequence;
      request.accepted_at = now;
      const digest = requestDigest(kind, request);
      const acceptedEvent = this.acceptedEvent(
        kind,
        request,
        digest,
        ledgerSequence,
        acceptanceSequence,
        now
      );
      const snapshot = replaySnapshot(kind, request, [acceptedEvent]);
      const nextMeta: LedgerMeta = {
        schema_version: 'deploy-hub.ledger-meta.v1',
        ledger_sequence: ledgerSequence,
        last_acceptance_sequence: acceptanceSequence,
        created_at: currentMeta.created_at,
        updated_at: now
      };
      const files = new Map(head.files);
      files.set(META_PATH, canonicalJson(nextMeta));
      files.set(requestPath(kind, id), canonicalJson(request));
      files.set(
        eventPath(kind, id, 1, readString(acceptedEvent, 'event_id')),
        canonicalJson(acceptedEvent)
      );
      files.set(snapshotPath(kind, id), canonicalJson(snapshot));

      const commitSha = this.repository.compareAndSwap(
        head.sha,
        files,
        `Accept ${kind} ${id}`
      );
      if (commitSha !== undefined) {
        return {
          kind,
          id,
          digest,
          request,
          snapshot,
          replay: false,
          commitSha
        };
      }
    }

    throw new LedgerConflictError(
      'Ledger compare-and-swap retry limit reached.'
    );
  }

  private appendState(
    kind: LedgerSubjectKind,
    id: string,
    toState: OperationState,
    eventType: string,
    payload: JsonObject,
    evidence: readonly JsonObject[] = [],
    producerKind: 'deploy_hub' | 'reconciler' = 'deploy_hub'
  ): LedgerRecord {
    for (let attempt = 1; attempt <= this.maxWriteAttempts; attempt++) {
      const head = this.repository.readHead();
      const current = this.requiredRecord(head.files, kind, id);
      const fromState = readOperationState(current.snapshot, 'state');
      if (fromState === toState) {
        return current;
      }
      assertOperationTransition(fromState, toState);

      const events = this.eventsFor(head.files, kind, id);
      const previous = events.at(-1);
      if (previous === undefined) {
        throw new LedgerConflictError(`Missing acceptance event: ${id}`);
      }
      const now = this.runtime.now();
      const meta = this.readMeta(head.files, now);
      const sequence = events.length + 1;
      const event = ledgerEvent({
        ledgerSequence: meta.ledger_sequence + 1,
        eventId: eventIdForSequence(meta.ledger_sequence + 1),
        kind,
        id,
        digest: current.digest,
        subjectSequence: sequence,
        previousEventId: readString(previous, 'event_id'),
        attempt: readInteger(current.snapshot, 'attempt'),
        eventType,
        occurredAt: now,
        producerKind,
        fromState,
        toState,
        payload,
        evidence
      });
      const snapshot = replaySnapshot(kind, current.request, [
        ...events,
        event
      ]);
      const nextMeta: LedgerMeta = {
        ...meta,
        ledger_sequence: meta.ledger_sequence + 1,
        updated_at: now
      };
      const files = new Map(head.files);
      files.set(META_PATH, canonicalJson(nextMeta));
      files.set(
        eventPath(kind, id, sequence, readString(event, 'event_id')),
        canonicalJson(event)
      );
      files.set(snapshotPath(kind, id), canonicalJson(snapshot));

      const commitSha = this.repository.compareAndSwap(
        head.sha,
        files,
        `${eventType} ${kind} ${id}`
      );
      if (commitSha !== undefined) {
        return { ...current, snapshot };
      }
    }

    throw new LedgerConflictError(
      'Ledger compare-and-swap retry limit reached.'
    );
  }

  private acceptedEvent(
    kind: LedgerSubjectKind,
    request: JsonObject,
    digest: string,
    ledgerSequence: number,
    acceptanceSequence: number,
    occurredAt: string
  ): JsonObject {
    const id = subjectId(kind, request);
    const payload: JsonObject = {
      environment: readString(request, 'environment'),
      acceptance_sequence: acceptanceSequence,
      order_key: orderKey(acceptanceSequence, id),
      resource_keys: this.resourceKeys(request, kind),
      ...(kind === 'deployment'
        ? {
            target: readObject(request, 'target'),
            source_sha: sourceSha(request)
          }
        : { validation_id: id })
    };

    return ledgerEvent({
      ledgerSequence,
      eventId: eventIdForSequence(ledgerSequence),
      kind,
      id,
      digest,
      subjectSequence: 1,
      attempt: 1,
      eventType: 'request_accepted',
      occurredAt,
      producerKind: 'deploy_hub',
      fromState: null,
      toState: 'accepted',
      payload,
      evidence: []
    });
  }

  private assertEvidenceIdentity(
    evidence: GitHubReconciliationEvidence,
    evidenceDigest: string
  ): void {
    const head = this.repository.readHead();
    const events = this.eventsFor(
      head.files,
      evidence.subjectKind,
      evidence.subjectId
    );
    for (const event of events) {
      const links = readArray(event, 'evidence');
      const matches = links.some(
        (link) => isJsonObject(link) && link.external_id === evidence.evidenceId
      );
      if (!matches) {
        continue;
      }
      const payload = readObject(event, 'payload');
      if (payload.message !== evidenceDigest) {
        throw new RequestIdConflictError(evidence.evidenceId);
      }
    }
  }

  private assertImmutableEvidence(
    evidence: GitHubReconciliationEvidence
  ): void {
    const record = this.requiredRecord(
      this.repository.readHead().files,
      evidence.subjectKind,
      evidence.subjectId
    );
    if (evidence.subjectKind === 'deployment') {
      if (evidence.sourceSha === undefined) {
        throw new LedgerConflictError(
          'Deployment evidence requires source SHA.'
        );
      }
      if (evidence.sourceSha !== sourceSha(record.request)) {
        throw new LedgerConflictError(
          'Reconciliation cannot replace the accepted source SHA.'
        );
      }
      if (
        evidence.state === 'succeeded' &&
        evidence.validationId === undefined
      ) {
        throw new LedgerConflictError(
          'Successful deployment evidence requires validation identity.'
        );
      }
      return;
    }

    const snapshotBefore = readObject(record.request, 'snapshot_before');
    const acceptedDigest = readString(snapshotBefore, 'digest');
    if (
      evidence.snapshotDigest !== undefined &&
      evidence.snapshotDigest !== acceptedDigest
    ) {
      throw new LedgerConflictError(
        'Reconciliation cannot replace the accepted environment snapshot.'
      );
    }
    if (evidence.state === 'succeeded' && evidence.workflow === undefined) {
      throw new LedgerConflictError(
        'Successful validation evidence requires a workflow.'
      );
    }
  }

  private readRecord(
    files: ReadonlyMap<string, string>,
    kind: LedgerSubjectKind,
    id: string
  ): LedgerRecord | undefined {
    const serializedRequest = files.get(requestPath(kind, id));
    const serializedSnapshot = files.get(snapshotPath(kind, id));
    if (serializedRequest === undefined && serializedSnapshot === undefined) {
      return undefined;
    }
    if (serializedRequest === undefined || serializedSnapshot === undefined) {
      throw new LedgerConflictError(`Incomplete ledger record: ${kind}/${id}`);
    }
    const request = parseJsonObject(serializedRequest);
    const snapshot = parseJsonObject(serializedSnapshot);
    return {
      kind,
      id,
      digest: readString(snapshot, 'request_digest'),
      request,
      snapshot
    };
  }

  private requiredRecord(
    files: ReadonlyMap<string, string>,
    kind: LedgerSubjectKind,
    id: string
  ): LedgerRecord {
    const record = this.readRecord(files, kind, id);
    if (record === undefined) {
      throw new LedgerConflictError(`Unknown ledger subject: ${kind}/${id}`);
    }
    return record;
  }

  private listRecords(files: ReadonlyMap<string, string>): LedgerRecord[] {
    const records: LedgerRecord[] = [];
    for (const path of files.keys()) {
      const match = path.match(
        /^ledger\/v1\/(deployments|validations)\/([^/]+)\/request\.json$/
      );
      if (match === null) {
        continue;
      }
      const kind = match[1] === 'deployments' ? 'deployment' : 'validation';
      const id = match[2];
      if (id === undefined) {
        continue;
      }
      records.push(this.requiredRecord(files, kind, id));
    }
    return records.sort((left, right) => {
      const leftSequence = readInteger(left.request, 'acceptance_sequence');
      const rightSequence = readInteger(right.request, 'acceptance_sequence');
      return leftSequence - rightSequence || left.id.localeCompare(right.id);
    });
  }

  private eventsFor(
    files: ReadonlyMap<string, string>,
    kind: LedgerSubjectKind,
    id: string
  ): JsonObject[] {
    const prefix = `${subjectRoot(kind, id)}/events/`;
    return [...files.entries()]
      .filter(([path]) => path.startsWith(prefix))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, contents]) => parseJsonObject(contents));
  }

  private readMeta(
    files: ReadonlyMap<string, string>,
    initialTime = this.runtime.now()
  ): LedgerMeta {
    const serialized = files.get(META_PATH);
    if (serialized === undefined) {
      return {
        schema_version: 'deploy-hub.ledger-meta.v1',
        ledger_sequence: 0,
        last_acceptance_sequence: 0,
        created_at: initialTime,
        updated_at: initialTime
      };
    }
    const value = parseJsonObject(serialized);
    if (value.schema_version !== 'deploy-hub.ledger-meta.v1') {
      throw new LedgerConflictError('Unsupported ledger metadata version.');
    }
    return value as LedgerMeta;
  }

  private resourceKeys(request: JsonObject, kind: LedgerSubjectKind): string[] {
    if (kind === 'validation') {
      return [readString(request, 'resource_key')];
    }
    return readArray(request, 'resource_keys').map((value) => {
      if (typeof value !== 'string' || value.length === 0) {
        throw new Error('resource_keys must contain strings.');
      }
      return value;
    });
  }
}

function requestDigest(kind: LedgerSubjectKind, request: JsonObject): string {
  const stable = cloneJson(request);
  delete stable.acceptance_sequence;
  delete stable.accepted_at;
  strip(stable, ['authority', 'authenticated_at']);
  strip(stable, ['requester', 'task', 'display_url']);

  if (kind === 'deployment') {
    strip(stable, ['source', 'resolved_at']);
    strip(stable, ['production_authorization', 'authorized_at']);
  } else {
    const snapshot = readObject(stable, 'snapshot_before');
    stable.snapshot_before = { digest: readString(snapshot, 'digest') };
  }

  return jsonDigest(stable);
}

function replaySnapshot(
  kind: LedgerSubjectKind,
  request: JsonObject,
  events: readonly JsonObject[]
): JsonObject {
  const first = events[0];
  if (first === undefined) {
    throw new LedgerConflictError('Cannot replay a request without events.');
  }
  const id = subjectId(kind, request);
  const digest = readString(first, 'request_digest');
  const acceptedAt = readString(request, 'accepted_at');
  const acceptanceSequence = readInteger(request, 'acceptance_sequence');
  const base: JsonObject =
    kind === 'deployment'
      ? {
          schema_version: 'deploy-hub.deployment-status.v1',
          request_id: id,
          request_digest: digest,
          state: 'accepted',
          phase: 'accepted',
          state_version: 1,
          event_sequence: 1,
          attempt: 1,
          accepted_at: acceptedAt,
          updated_at: acceptedAt,
          queue: {
            order_key: orderKey(acceptanceSequence, id),
            resource_keys: readArray(request, 'resource_keys'),
            blocked_by: []
          },
          mutation: { state: 'not_started' },
          validation: { state: 'not_started' },
          warnings: [],
          evidence: []
        }
      : {
          schema_version: 'deploy-hub.validation-status.v1',
          validation_id: id,
          request_digest: digest,
          state: 'accepted',
          phase: 'accepted',
          state_version: 1,
          event_sequence: 1,
          attempt: 1,
          accepted_at: acceptedAt,
          updated_at: acceptedAt,
          queue_order_key: orderKey(acceptanceSequence, id),
          warnings: [],
          evidence: []
        };

  for (const event of events.slice(1)) {
    const transition = readObject(event, 'transition');
    const state = readOperationState(transition, 'to_state');
    base.state = state;
    base.phase = readString(transition, 'to_phase');
    base.state_version = readInteger(event, 'state_version');
    base.event_sequence = readInteger(event, 'subject_sequence');
    base.updated_at = readString(event, 'occurred_at');
    const payload = readObject(event, 'payload');

    if (state === 'waiting' && kind === 'deployment') {
      const queue = readObject(base, 'queue');
      queue.blocked_by = payload.blocked_by ?? [];
    }

    if (TERMINAL_STATES.has(state)) {
      applyTerminal(base, request, event, kind, state);
    }
  }
  return base;
}

function applyTerminal(
  snapshot: JsonObject,
  request: JsonObject,
  event: JsonObject,
  kind: LedgerSubjectKind,
  state: OperationState
): void {
  const payload = readObject(event, 'payload');
  const result = readObject(payload, 'terminal_result');
  const occurredAt = readString(event, 'occurred_at');
  snapshot.terminal_at = occurredAt;
  snapshot.phase = 'terminal';
  snapshot.evidence = readArray(event, 'evidence');

  if (state === 'failed' || state === 'stale') {
    snapshot.failure = readObject(result, 'failure');
  }
  if (state === 'cancelled') {
    snapshot.cancel_reason =
      typeof payload.reason === 'string' ? payload.reason : 'Cancelled.';
  }

  if (kind === 'deployment') {
    snapshot.mutation = {
      state: result.environment_mutated === true ? 'completed' : 'not_started'
    };
    if (result.runtime_verified === true) {
      snapshot.runtime_proof = {
        source_sha: sourceSha(request),
        verified_at: occurredAt,
        evidence_url: readString(payload, 'evidence_url')
      };
    }
    snapshot.validation =
      result.validation_succeeded === true
        ? {
            state: 'succeeded',
            validation_id: readString(payload, 'validation_id')
          }
        : {
            state:
              state === 'failed' &&
              result.environment_mutated === true &&
              result.runtime_verified === true
                ? 'failed'
                : 'not_started'
          };
    return;
  }

  if (state === 'succeeded') {
    snapshot.snapshot_after = readObject(request, 'snapshot_before');
    snapshot.workflow = readObject(payload, 'workflow');
  }
}

function ledgerEvent(input: {
  readonly ledgerSequence: number;
  readonly eventId: string;
  readonly kind: LedgerSubjectKind;
  readonly id: string;
  readonly digest: string;
  readonly subjectSequence: number;
  readonly previousEventId?: string;
  readonly attempt: number;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly producerKind: 'deploy_hub' | 'reconciler';
  readonly fromState: OperationState | null;
  readonly toState: OperationState;
  readonly payload: JsonObject;
  readonly evidence: readonly JsonObject[];
}): JsonObject {
  return {
    schema_version: 'deploy-hub.ledger-event.v1',
    ledger_sequence: input.ledgerSequence,
    event_id: input.eventId,
    subject_kind: input.kind,
    subject_id: input.id,
    request_digest: input.digest,
    subject_sequence: input.subjectSequence,
    state_version: input.subjectSequence,
    attempt: input.attempt,
    event_type: input.eventType,
    occurred_at: input.occurredAt,
    producer: {
      kind: input.producerKind,
      id:
        input.producerKind === 'reconciler' ? 'github-reconciler' : 'deploy-hub'
    },
    transition: {
      from_state: input.fromState,
      to_state: input.toState,
      from_phase:
        input.fromState === null ? null : phaseForState(input.fromState),
      to_phase: phaseForState(input.toState)
    },
    payload: input.payload,
    evidence: [...input.evidence],
    ...(input.previousEventId === undefined
      ? {}
      : { previous_event_id: input.previousEventId })
  };
}

function terminalResult(
  evidence: GitHubReconciliationEvidence,
  state: OperationState
): JsonObject {
  const failure =
    evidence.failure ??
    (state === 'stale'
      ? {
          code: 'STALE_SOURCE',
          class: 'stale_source' as const,
          message: 'The immutable accepted source is no longer eligible.',
          retryable: false
        }
      : {
          code: 'RECONCILED_FAILURE',
          class: 'reconciliation' as const,
          message: 'GitHub evidence proves that the operation failed.',
          retryable: false
        });
  return {
    state,
    environment_mutated: evidence.environmentMutated ?? state === 'succeeded',
    runtime_verified: evidence.runtimeVerified ?? state === 'succeeded',
    validation_succeeded: evidence.validationSucceeded ?? state === 'succeeded',
    ...(state === 'failed' || state === 'stale'
      ? { failure: failureToJson(failure) }
      : {})
  };
}

function nextReconciledState(
  current: OperationState,
  evidence: GitHubReconciliationEvidence
): OperationState {
  const target = evidence.state;
  if (target === 'cancelled' || target === 'stale') {
    assertOperationTransition(current, target);
    return target;
  }
  if (current === 'accepted' || current === 'waiting') {
    return 'dispatched';
  }
  if (target === 'dispatched') {
    throw new LedgerConflictError(
      `Cannot reconcile ${current} back to dispatched.`
    );
  }
  if (current === 'dispatched') {
    if (target === 'failed' && evidence.environmentMutated !== true) {
      return 'failed';
    }
    return 'running';
  }
  if (current === 'running') {
    return target;
  }
  throw new LedgerConflictError(`Cannot reconcile ${current} to ${target}.`);
}

function validateEventSequence(
  events: readonly JsonObject[],
  record: LedgerRecord
): void {
  let previousId: string | undefined;
  let previousState: OperationState | null = null;
  for (const [index, event] of events.entries()) {
    const expectedSequence = index + 1;
    if (
      readInteger(event, 'subject_sequence') !== expectedSequence ||
      readInteger(event, 'state_version') !== expectedSequence
    ) {
      throw new LedgerConflictError(`Subject sequence mismatch: ${record.id}`);
    }
    if (
      readString(event, 'subject_id') !== record.id ||
      readString(event, 'subject_kind') !== record.kind ||
      readString(event, 'request_digest') !== record.digest
    ) {
      throw new LedgerConflictError(`Event identity mismatch: ${record.id}`);
    }
    const transition = readObject(event, 'transition');
    const fromState = transition.from_state;
    const toState = readOperationState(transition, 'to_state');
    if (fromState !== previousState) {
      throw new LedgerConflictError(`Event predecessor mismatch: ${record.id}`);
    }
    if (previousState !== null) {
      assertOperationTransition(previousState, toState);
      if (event.previous_event_id !== previousId) {
        throw new LedgerConflictError(`Event ID chain mismatch: ${record.id}`);
      }
    } else if ('previous_event_id' in event) {
      throw new LedgerConflictError(
        `Acceptance event has a predecessor: ${record.id}`
      );
    }
    previousId = readString(event, 'event_id');
    previousState = toState;
  }
}

function evidenceToJson(evidence: GitHubReconciliationEvidence): JsonObject {
  return {
    evidenceId: evidence.evidenceId,
    subjectKind: evidence.subjectKind,
    subjectId: evidence.subjectId,
    state: evidence.state,
    evidenceUrl: evidence.evidenceUrl,
    ...(evidence.sourceSha === undefined
      ? {}
      : { sourceSha: evidence.sourceSha }),
    ...(evidence.snapshotDigest === undefined
      ? {}
      : { snapshotDigest: evidence.snapshotDigest }),
    ...(evidence.validationId === undefined
      ? {}
      : { validationId: evidence.validationId }),
    ...(evidence.workflow === undefined ? {} : { workflow: evidence.workflow }),
    ...(evidence.environmentMutated === undefined
      ? {}
      : { environmentMutated: evidence.environmentMutated }),
    ...(evidence.runtimeVerified === undefined
      ? {}
      : { runtimeVerified: evidence.runtimeVerified }),
    ...(evidence.validationSucceeded === undefined
      ? {}
      : { validationSucceeded: evidence.validationSucceeded }),
    ...(evidence.cancelReason === undefined
      ? {}
      : { cancelReason: evidence.cancelReason }),
    ...(evidence.failure === undefined
      ? {}
      : { failure: failureToJson(evidence.failure) })
  };
}

function failureToJson(failure: ReconciliationFailure): JsonObject {
  return {
    code: failure.code,
    class: failure.class,
    message: failure.message,
    retryable: failure.retryable,
    ...(failure.detailsUrl === undefined
      ? {}
      : { details_url: failure.detailsUrl })
  };
}

function phaseForState(state: OperationState): string {
  switch (state) {
    case 'accepted':
      return 'accepted';
    case 'waiting':
      return 'waiting_for_resource';
    case 'dispatched':
      return 'dispatching';
    case 'running':
      return 'workflow_queued';
    case 'succeeded':
    case 'failed':
    case 'cancelled':
    case 'stale':
      return 'terminal';
  }
}

function subjectId(kind: LedgerSubjectKind, request: JsonObject): string {
  return readString(
    request,
    kind === 'deployment' ? 'request_id' : 'validation_id'
  );
}

function sourceSha(request: JsonObject): string {
  return readString(readObject(request, 'source'), 'sha');
}

function subjectRoot(kind: LedgerSubjectKind, id: string): string {
  return `ledger/v1/${kind === 'deployment' ? 'deployments' : 'validations'}/${id}`;
}

function requestPath(kind: LedgerSubjectKind, id: string): string {
  return `${subjectRoot(kind, id)}/request.json`;
}

function snapshotPath(kind: LedgerSubjectKind, id: string): string {
  return `${subjectRoot(kind, id)}/snapshot.json`;
}

function eventPath(
  kind: LedgerSubjectKind,
  id: string,
  sequence: number,
  eventId: string
): string {
  return `${subjectRoot(kind, id)}/events/${String(sequence).padStart(10, '0')}-${eventId}.json`;
}

function orderKey(acceptanceSequence: number, id: string): string {
  return `${String(acceptanceSequence).padStart(20, '0')}/${id}`;
}

function eventIdForSequence(ledgerSequence: number): string {
  return `00000000-0000-4000-8000-${String(ledgerSequence).padStart(12, '0')}`;
}

function strip(object: JsonObject, path: readonly string[]): void {
  let current: JsonObject = object;
  for (const key of path.slice(0, -1)) {
    const value: JsonValue | undefined = current[key];
    if (!isJsonObject(value)) {
      return;
    }
    current = value;
  }
  const finalKey = path.at(-1);
  if (finalKey !== undefined) {
    delete current[finalKey];
  }
}

function readObject(object: JsonObject, key: string): JsonObject {
  const value = object[key];
  if (!isJsonObject(value)) {
    throw new Error(`${key} must be an object.`);
  }
  return value;
}

function readArray(object: JsonObject, key: string): JsonValue[] {
  const value = object[key];
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array.`);
  }
  return value;
}

function readString(object: JsonObject, key: string): string {
  const value = object[key];
  if (typeof value !== 'string') {
    throw new Error(`${key} must be a string.`);
  }
  return value;
}

function readInteger(object: JsonObject, key: string): number {
  const value = object[key];
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${key} must be an integer.`);
  }
  return value as number;
}

function readOperationState(object: JsonObject, key: string): OperationState {
  const value = readString(object, key);
  if (
    ![
      'accepted',
      'waiting',
      'dispatched',
      'running',
      'succeeded',
      'failed',
      'cancelled',
      'stale'
    ].includes(value)
  ) {
    throw new Error(`${key} contains an unknown operation state.`);
  }
  return value as OperationState;
}

function assertUuid(value: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new Error('Ledger subject ID must be a lowercase UUIDv4.');
  }
}

function assertSha(value: string): void {
  if (!SHA_PATTERN.test(value)) {
    throw new Error('Deployment source SHA must be a lowercase 40-hex value.');
  }
}
