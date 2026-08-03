# ADR 0006: Use one Git-backed control ledger with GitHub projections

Status: Retired for live use; retained as Task 6 prototype record

Date: 2026-08-03

The prototype proved these semantics can be implemented, not that Deploy Hub
needs them. The owner selected workflow-run/status/runtime evidence as the
smaller MVP source of truth. No live `state/v1` branch or Git adapter will be
created. The decision below is historical, not current implementation guidance.

## Context

Deploy Hub needs atomic idempotency, deterministic waiting, durable cancel and
retry intent, terminal evidence, and restart reconstruction. It must provide
those properties without recreating the Release Bus database state machine.

GitHub Deployments and Check Runs are valuable user-facing evidence, but they
cannot be the complete ledger:

- Deployment status history older than 90 days is not returned, although the
  current deployment status remains.
- Check Runs are mutable projections, and GitHub may delete older Check Runs
  after more than 1,000 runs with the same name in one suite.
- Neither object provides an atomic create-if-absent record plus an append-only
  machine event journal for cancel/retry intent and conflicting duplicate
  detection.

GitHub's Git database API can create blobs, trees, and commits and update a
branch reference without force. A non-fast-forward update fails instead of
overwriting a concurrent writer. This gives Deploy Hub one small
compare-and-swap boundary using GitHub itself.

Authoritative GitHub documentation:

- [Git database API workflow](https://docs.github.com/en/rest/guides/using-the-rest-api-to-interact-with-your-git-database)
- [Git reference create/update semantics](https://docs.github.com/en/rest/git/refs)
- [GitHub Deployments](https://docs.github.com/en/rest/deployments/deployments)
- [Deployment-status retention](https://docs.github.com/en/rest/deployments/statuses#about-deployment-statuses)
- [Check Run API and retention behavior](https://docs.github.com/en/rest/checks/runs)

## Decision

Use one protected non-default branch in the private `deploy-hub` repository:

```text
refs/heads/state/v1
```

This branch is the only authoritative Deploy Hub state. `main` remains source,
UI, schemas, documentation, and later application code.

The state branch contains accepted immutable requests, append-only event files,
and reproducible current snapshots:

```text
ledger/v1/meta.json
ledger/v1/deployments/<request-id>/request.json
ledger/v1/deployments/<request-id>/events/<sequence>-<event-id>.json
ledger/v1/deployments/<request-id>/snapshot.json
ledger/v1/validations/<validation-id>/request.json
ledger/v1/validations/<validation-id>/events/<sequence>-<event-id>.json
ledger/v1/validations/<validation-id>/snapshot.json
```

Each state change is one Git commit that adds one immutable
`ledger-event.v1` event and replaces only the derived snapshot for its subject.
The event history plus immutable request is authoritative; `snapshot.json` is
a cache that must be reproducible byte-for-byte by replay. Each event records
its global and per-subject sequence, predecessor, state/phase transition, and
bounded event-specific payload. `meta.json` increments a global ledger sequence
on every commit and a separate acceptance sequence only for new deployment or
validation requests.

### Acceptance and idempotency

1. Canonicalize the stable authenticated request intent defined by the v1
   contract with RFC 8785 semantics and calculate its SHA-256 idempotency
   digest. Server clock fields and acceptance sequence are excluded.
2. Read the current `state/v1` head, `meta.json`, and request path.
3. If the request ID already exists with the same digest, return the existing
   logical request without adding an event or external projection.
4. If it exists with a different digest, fail closed with
   `IDEMPOTENCY_CONFLICT`.
5. Otherwise allocate `meta.last_acceptance_sequence + 1`, enrich the accepted
   record with immutable server audit fields, create the request, sequence-1
   acceptance event, snapshot, and updated meta file in one child commit, then
   update `state/v1` with `force=false`.
6. On a non-fast-forward conflict, reread the new head and repeat the same
   decision with a bounded retry policy.

The request path and non-force branch update provide the atomic boundary. No
process-local mutex is correctness-critical.

### Event append and competing workers

Every command, claim, dispatch link, callback, state change, communication
outcome, and reconciliation decision is appended through the same non-force
branch update. If two workers race, one branch update succeeds and the other
must reread, replay, and either retry a still-valid transition or return the
already-recorded result.

Queue order within each declared resource key is:

```text
(acceptance_sequence ascending, request_id ascending)
```

The acceptance sequence is allocated by the same ledger compare-and-swap that
creates the request, so concurrent workers cannot share it. The UUID tie-break
is defensive and makes the order total even if corrupted legacy input is under
reconciliation.
The current owner is derived from active claim events and eligible waiting
records; it is not a separately editable queue row.

### GitHub projections

After ledger acceptance, create and link:

- one GitHub Deployment per attempt in the source repository, pinned to the
  exact source SHA;
- one Check Run per attempt on that SHA, with
  `external_id=<request-id>:<attempt>` and the Deploy Hub UI as `details_url`;
- the canonical repository workflow run and its artifacts/evidence;
- repository-owned CI-drop and release-note outcome events.

These are discoverable projections and runtime evidence. The ledger remains
authoritative because projection creation can partially fail and GitHub applies
different retention policies to their histories.

### Cancellation, retry, and terminal truth

- Append `cancel_requested` before asking GitHub to cancel a workflow.
- Append `retry_requested` before creating a new attempt.
- Retry never changes the immutable request or source SHA. A stale source
  requires a new request ID.
- Each attempt has its own terminal event and projections. A later explicit
  retry changes the logical request's current attempt but never erases the
  earlier terminal attempt.
- Success is recorded only after canonical runtime proof and mandatory
  environment-snapshot validation. Communication failures remain warnings.

### Reconstruction

On startup or webhook ambiguity, read the state branch, validate every request
digest, replay each event sequence, and compare the computed snapshot with the
stored snapshot. Then reconcile nonterminal records with GitHub Deployments,
Check Runs, workflow runs, runtime proof, and communication evidence. Any
contradiction fails closed and emits a reconciliation event; it is never fixed
by silently changing the accepted SHA.

## Consequences

### Positive

- No Deploy Hub database, S3 ledger, release train, or scheduled lifecycle
  Lambda is required.
- Git gives immutable history, reviewable evidence, and one concurrency
  primitive with no hidden in-memory authority.
- A complete task can be reconstructed after process loss.
- GitHub Deployments and Check Runs remain first-class UX without being asked
  to store facts they cannot retain reliably.

### Costs and limits

- Raw Git-object writes and replay are more work than CRUD. Task 6 must prove
  conflict handling, repository-size bounds, compaction/index strategy, and API
  rate behavior with fake and isolated repositories.
- The one ledger branch serializes short metadata commits. It does not
  serialize builds or deployments; an unexpected sustained write bottleneck is
  evidence to revisit the storage decision.
- A live `state/v1` branch would have required branch protection and narrow
  writer permissions; the retired design will not create it.
- Snapshots may be regenerated, but event and request files may not be edited or
  deleted during normal operation.

## Rejected alternatives

- **GitHub Deployments or Check Runs alone:** insufficient durable command and
  event history; documented retention limitations.
- **One GitHub Issue per request:** readable but no atomic request-ID
  uniqueness, noisy issue UX, and label/comment mutation is a weaker machine
  compare-and-swap boundary.
- **One branch/ref per request:** strong isolation but unbounded visible ref
  proliferation and harder global waiting reconstruction.
- **A new database or S3 ledger:** operationally durable but premature; it
  recreates infrastructure before GitHub-native evidence has been tested.
- **Release Bus v2 tables:** retain the train, candidate, manifest, lock, and
  reconciler abstractions that Deploy Hub is explicitly replacing.

## Revisit triggers

Reconsider the ledger only if Task 6 proves a material limit in correctness,
GitHub API rate/size behavior, write latency, retention, or operational
recovery. A replacement must preserve the accepted contracts and migration
history rather than introducing a second competing authority.
