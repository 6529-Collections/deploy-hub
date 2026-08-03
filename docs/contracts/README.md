# Deploy Hub Control-Plane Contracts v1

Status: Accepted Task 2 contract

Date: 2026-08-03

Live-use note: these contracts remain evidence of the Task 2/6 prototype. K1–K4
in `../kiss-architecture-review.md` require the custom Git ledger, separate
validation lifecycle, custom queues/locks, and duplicate projections to justify
themselves against a smaller workflow-run/status/runtime-evidence MVP before
live implementation.

## Purpose and boundary

These contracts define the smallest durable Deploy Hub control plane. They
describe atomic deployment operations, environment-snapshot validations,
cancel/retry commands, task events, and communication side effects.

They do not define a release train. A Codex task may coordinate several atomic
operations in its own plan, but Deploy Hub stores and executes each repository
unit independently and links them to one validation only when the agent asks.

Normative JSON Schemas in this directory use JSON Schema 2020-12:

- `common.v1.schema.json`
- `error.v1.schema.json`
- `ledger-meta.v1.schema.json`
- `ledger-event.v1.schema.json`
- `deployment-request.v1.schema.json`
- `deployment-status.v1.schema.json`
- `deployment-cancel.v1.schema.json`
- `deployment-retry.v1.schema.json`
- `validation-request.v1.schema.json`
- `validation-status.v1.schema.json`
- `validation-cancel.v1.schema.json`
- `validation-retry.v1.schema.json`
- `task-event.v1.schema.json`
- `communication-outcome.v1.schema.json`

If prose and schema disagree, the stricter rule applies until the contract is
versioned. Implementations must not silently relax v1.

## Common serialization and identity rules

1. Contract objects use UTF-8 JSON, reject duplicate object keys, reject
   non-finite numbers, and reject unknown fields unless a schema explicitly
   allows them.
2. UUIDs are lowercase RFC 4122 version 4. Git SHAs are full lowercase 40-hex
   values. SHA-256 values are lowercase 64-hex values.
3. Timestamps are UTC RFC 3339 strings ending in `Z`. The service, not the
   caller, sets `acceptance_sequence`, `accepted_at`, `authenticated_at`, state
   timestamps, and event times.
4. Digests use [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785)
   followed by SHA-256.
5. `request_digest` is the idempotency digest of stable authenticated intent,
   not a digest of server clock readings. For a deployment it covers schema
   version, request ID, stable requester/authority identity fields,
   source repository/ref/SHA/PR identities, environment, intent, production
   action and authority subject, target, resource keys, plan reference, and
   communication policy. It excludes acceptance/authentication/resolution
   timestamps, acceptance sequence, and task display URL. For a validation it
   covers the corresponding identities, environment/resource key, linked
   request IDs, snapshot digest, tooling SHA, and pack policy. Command digests
   likewise exclude only their server timestamps.
6. The Git commit protects the complete accepted record, including excluded
   audit timestamps and evidence URLs. Replay compares the stable request
   digest, then returns the original accepted record rather than regenerating
   server fields.
7. Arrays whose meaning is a set are sorted before canonicalization and must
   contain no duplicate semantic key, including case-insensitive contributor
   logins and component keys.
8. Credentials, bearer tokens, JWTs, webhook secrets, GitHub installation
   tokens, callback secrets, and raw authorization headers are forbidden from
   every contract object and ledger commit.

### Distinct identities

The following identities never substitute for one another:

| Identity | Meaning | Source |
| --- | --- | --- |
| `requester` | Human or Codex task asking for the deployment | Authenticated request context plus task metadata |
| `authority` | GitHub user whose authenticated token and current operator policy permit the exact action/environment; also the GitHub executor | Server resolution through GitHub `/user`; never caller-supplied |
| workflow actor | GitHub identity recorded on the exact canonical run | GitHub run evidence |
| `ci_drop_contributors` | Humans proven in the deployed operation for the CI post | Repository-owned immutable GitHub evidence |
| `release_note_contributors_by_pr` | Humans proven separately for each release-note PR | Repository-owned PR/commit evidence |

The accepted API request is server-enriched with requester and authority. A
client cannot claim either identity by sending JSON fields.

## Deployment request

One request means one canonical repository workflow unit:

- frontend unit `web`; or
- one allowlisted backend service.

Several backend services are several deployment requests. Several repositories
are several deployment requests. `plan_reference` is correlation only.

### Fields

| Field | Rule |
| --- | --- |
| `schema_version` | Exact `deploy-hub.deployment-request.v1` |
| `request_id` | Client-generated UUIDv4 and the idempotency key |
| `acceptance_sequence` | Globally unique monotonic integer allocated in the acceptance ledger commit |
| `accepted_at` | Trusted server audit time; not the concurrency primitive |
| `requester` | Server-enriched requester; a Codex requester must include the originating task ID |
| `authority` | Server-enriched authenticated authority and authentication time |
| `source.repository` | Exact frontend or backend GitHub repository |
| `source.ref` | Human-readable source ref resolved at acceptance; never used instead of the SHA after acceptance |
| `source.sha` | Immutable accepted source |
| `source.resolved_at` | Server time at which the ref/PR was resolved |
| `source.pull_requests` | Exact PR numbers and head SHAs represented by the request; may be empty for an explicitly justified internal/recovery deployment |
| `environment` | `staging` or `production` |
| `intent` | Must be `deploy_staging` or `deploy_production` and match the environment |
| `production_authorization` | Required only for production; exact action, time, and authority subject |
| `target` | `frontend/web` or one backend unit |
| `resource_keys` | Server-derived mutation-conflict domains; never trusted from the caller |
| `plan_reference` | Optional agent-owned plan ID and display order; creates no train, lock, lifecycle, or implicit next environment |
| `communication` | Repository-owned CI posting plus production release-note policy; never accepts contributor lists |

### Cross-field validation

- Source repository and target surface must match.
- Frontend target unit must be `web`; backend unit must exist in the exact
  allowlist version used by the adapter.
- Every `resource_key` must match the environment. The server recomputes and
  compares the complete set before acceptance.
- For a PR-bound request, every recorded PR must still have the recorded head
  SHA at acceptance. Authorization happens after this resolution.
- Production source ref is exactly `main`; the accepted SHA must equal current
  remote `main` at acceptance and must be rechecked immediately before
  mutation. Production authorization subject must equal `authority.subject`.
- Staging release notes are always `not_applicable`.
- Production release notes are `automatic` or `explicit_opt_out`. A no-PR
  reason is required for explicit internal, rollback, repair, or recovery work.
- `plan_reference.ordinal <= plan_reference.total`.
- No request may infer production authority from a staging request, prior
  deployment, PR label, branch name, or agent plan.

### Acceptance responses

| Result | HTTP intent | Machine code | Behavior |
| --- | ---: | --- | --- |
| New request | `202` | `ACCEPTED` | Ledger acceptance committed; projections may still be pending |
| Identical replay | `200` | `IDEMPOTENT_REPLAY` | Return the existing request/status; create nothing |
| Same ID, different digest | `409` | `IDEMPOTENCY_CONFLICT` | Return stored and submitted digests; mutate nothing |
| Source already moved | `409` | `STALE_SOURCE` | Do not accept a request for a different implicit SHA |
| Invalid/unauthorized | `400`, `401`, or `403` | Stable validation/auth code | No ledger or GitHub mutation |

All error responses use `{schema_version, code, message, retryable,
details_url?}` with schema version `deploy-hub.error.v1`; `message` is safe for
PR/UI display and contains no secret.

## Deployment status and lifecycle

`deployment-status.v1` is a derived snapshot. The immutable event history is
authoritative and replay must reproduce the snapshot byte-for-byte.

### States

| State | Meaning |
| --- | --- |
| `accepted` | Immutable request is committed; no execution owner yet |
| `waiting` | Eligible but one or more required resource/validation conditions are owned by an earlier request |
| `dispatched` | Attempt projections were created and canonical workflow dispatch was accepted or is being correlated |
| `running` | Canonical workflow is queued/running, mutation is in progress, runtime proof is running, or linked E2E is nonterminal |
| `succeeded` | Exact runtime is proven and linked mandatory snapshot validation succeeded |
| `failed` | Attempt cannot truthfully succeed; failure says whether the environment mutated and whether explicit retry is permitted |
| `cancelled` | Cancel intent is reconciled and no unknown mutation remains |
| `stale` | Accepted source is no longer eligible before mutation; never means a new SHA was substituted |

### Allowed transitions

```text
accepted -> waiting | dispatched | cancelled | stale
waiting -> dispatched | cancelled | stale
dispatched -> running | failed | cancelled | stale
running -> succeeded | failed | cancelled
failed --retry_requested event/new attempt--> waiting | dispatched
cancelled --retry_requested event/new attempt--> waiting | dispatched
stale -> terminal; a new SHA requires a new request ID
```

The transition from a previous terminal attempt to a new attempt does not
erase or reopen that attempt. It advances `attempt`, creates new projections,
and records a new current snapshot for the same immutable logical request.

### Phases

Phases explain progress without multiplying lifecycle states:

`accepted`, `waiting_for_resource`, `dispatching`, `workflow_queued`,
`building`, `waiting_for_mutation_claim`, `mutating`, `verifying_runtime`,
`waiting_for_validation`, `validating_environment`, `terminal`.

### Mutation claims and concurrency

- Build/preparation may run without an environment mutation claim.
- Immediately before its first environment mutation, the canonical workflow
  requests a claim for every server-derived resource key.
- A claim is granted only if the request is the earliest eligible waiting
  request for all keys and there is no active validation claim for that
  environment.
- The claim and transition are one ledger commit. A later worker loses the Git
  compare-and-swap race and must replay.
- Different backend resource keys may mutate concurrently. Frontend and backend
  capacity is independent. Staging and production are independent.
- A validation claim blocks only mutation to its own environment. It does not
  block builds, PR CI, the other environment, or non-mutating work.
- Task 8 may declare additional conflict-domain keys for exceptional services;
  it may not restore an unconditional environment-wide backend mutex.

### Queue order and ownership

The order key is exactly:

```text
<acceptance_sequence zero-padded to 20 digits>/<request_id>
```

For each resource key, the eligible record with the lexically smallest order
key is next. A multi-key request must be next for all keys before claiming any;
the grant is atomic. The current owner comes from active claim events. Queue
position is a derived hint and never an authorization fact.

### Terminal rules

- `succeeded`: mutation is `completed`, runtime proof source SHA equals the
  accepted SHA, validation state is `succeeded`, snapshot digests match before
  and after E2E, and required evidence links exist.
- `failed`: includes a stable failure code/class, retryability, mutation state,
  and diagnostic link. `deployed but validation failed` is failed with mutation
  completed; it is never rolled back to pre-deploy truth.
- `cancelled`: includes a reason and is legal only after reconciliation proves
  no unknown mutation. If cancellation races with mutation, remain running or
  fail with explicit partial/unknown mutation until reconciled.
- `stale`: only before mutation. Moved PR head, moved production `main`, deleted
  ref, superseded exact source, or invalidated authorization ends the attempt.
  A running/mutated request never becomes stale; later environment drift is a
  failure.
- Communication outcomes do not change any terminal. A successful deployment
  with failed CI/release-note side effects is `succeeded` plus warnings.

## Cancel command

`deployment-cancel.v1` contains command ID, request ID, exact expected attempt,
expected state version, reason, requester, authority, and server acceptance
time.

Rules:

1. Authorize cancel for this exact environment/request.
2. Compare expected attempt and state version. A mismatch returns `409
   COMMAND_PRECONDITION_FAILED` with current status.
3. Append `cancel_requested` before calling GitHub cancellation APIs.
4. Identical command ID/payload is idempotent. Conflicting reuse fails closed.
5. Accepted/waiting work with no external attempt may become cancelled
   immediately.
6. Dispatched/running work remains nonterminal until the workflow and runtime
   are reconciled.
7. Cancel of an already terminal attempt returns its status without mutation.

## Retry command

`deployment-retry.v1` contains command ID, request ID, previous attempt,
expected state version, exact terminal event ID, reason, requester, authority,
and server acceptance time.

Rules:

- Retry is explicit; no product E2E failure auto-retries into green.
- The terminal event must belong to the previous current attempt.
- Failed attempts may retry when `retryable=true`, or with a separately audited
  break-glass authority defined by Task 3.
- Cancelled attempts may retry only if exact source eligibility and authority
  are revalidated.
- Stale attempts cannot retry. Submit a new request with a new ID and exact SHA.
- Retry cannot change request, target, environment, production authorization,
  PR set, communication policy, or source SHA.
- Append `retry_requested`, increment attempt exactly once, then create a new
  GitHub Deployment and Check Run. Do not reuse a concluded projection.

## Environment-snapshot validation

A validation is a separate operation because it describes one whole
environment at one moment, not one repository deployment.

### Request fields

| Field | Rule |
| --- | --- |
| `validation_id` | UUIDv4 and idempotency key |
| `requester`, `authority` | Same separation as deployment |
| `environment` | `staging` or `production` |
| `resource_key` | Exactly `<environment>:validation` |
| `linked_deployment_request_ids` | One or more exact deployment requests; a coordinated set shares this one result |
| `snapshot_before` | Canonical complete relevant runtime snapshot observed after all linked deployments |
| `test_tooling` | Exact frontend repository SHA that owns the selected Playwright packs |
| `pack_policy` | Full staging or production baseline policy, pack IDs, and `read_only=true` |

### Snapshot rules

- Components are sorted by `component_key` and keys are unique.
- A snapshot contains `frontend:web` and the complete relevant backend unit
  set required by policy, including API plus every linked deployed backend
  service. Task 14/17 define the maintained policy set; callers cannot omit a
  linked target.
- `component_key`, repository, and unit must agree.
- `source_sha` is the repository source identity. `runtime_identity` contains
  the independently observed value: HTTP version SHA, Lambda CodeSha256,
  Elastic Beanstalk VersionLabel, or PM2 checkout SHA.
- Every component has independently retrievable evidence and observation time.
- Snapshot digest covers schema version, environment, and canonical component
  array. It excludes `observed_at` so a repeated observation of unchanged
  runtime produces the same digest; individual component evidence still keeps
  observation times.
- `snapshot_before.environment` must equal request environment.
- `test_tooling.sha` must be a known frontend commit containing every selected
  pack. For backend-only work it is normally the exact currently deployed
  frontend SHA.

### Validation lifecycle

```text
accepted -> waiting -> dispatched -> running -> succeeded | failed | cancelled
accepted/waiting/dispatched -> stale (before packs start)
```

1. Wait until no same-environment mutation claim exists.
2. Atomically claim `<environment>:validation` and re-observe
   `snapshot_before`; mismatch is terminal `stale` before E2E.
3. Dispatch the exact frontend-owned E2E workflow and packs.
4. Treat bounded setup/infrastructure errors as retryable. Product assertions
   are non-retryable without explicit human/agent decision.
5. Re-observe `snapshot_after` before accepting the result.
6. If before/after digests differ, fail `ENVIRONMENT_DRIFT` even if tests are
   green.
7. Succeed only when full baseline packs are green, evidence is valid, and the
   digests are equal.
8. Link the same validation terminal to every coordinated deployment request.

Partial diagnostic pack runs never satisfy mandatory baseline validation.

Validation cancel and retry use `validation-cancel.v1` and
`validation-retry.v1`. They have the same compare-and-swap, idempotency,
intent-before-side-effect, terminal-attempt, and exact-evidence rules as
deployment commands. A stale validation cannot retry because its immutable
snapshot is no longer current; create a new validation ID and snapshot.

## Git ledger representation

ADR 0006 is authoritative. The state branch is `refs/heads/state/v1` and the
layout is:

```text
ledger/v1/meta.json
ledger/v1/deployments/<request-id>/request.json
ledger/v1/deployments/<request-id>/events/<sequence>-<event-id>.json
ledger/v1/deployments/<request-id>/snapshot.json
ledger/v1/validations/<validation-id>/request.json
ledger/v1/validations/<validation-id>/events/<sequence>-<event-id>.json
ledger/v1/validations/<validation-id>/snapshot.json
```

Sequence filenames use ten-digit zero padding. Sequence starts at 1 and has no
gap. Each state commit:

1. reads and validates current branch head and global metadata;
2. replays the subject and global active claims;
3. validates the requested transition;
4. creates exactly one immutable event file and the derived snapshot update;
5. creates a child commit of the read head;
6. updates `state/v1` with `force=false`;
7. on conflict, discards the candidate snapshot, rereads, and reevaluates.

`meta.json` conforms to `ledger-meta.v1`. Every file under `events/` conforms
to `ledger-event.v1`, carries the global and per-subject sequence, records its
before/after state and phase, and uses the event-specific bounded payload. The
schema forbids a predecessor on sequence 1 and requires one on every later
event. `ledger_sequence` increases by one on every state commit.
`last_acceptance_sequence` increases by one only when a new deployment or
validation request is accepted; commands, callbacks and reconciliation events
retain it.

There is no blind merge and no force push. A transition that became invalid is
returned as an idempotent existing result or a state conflict.

### External mapping

| Durable/visible object | Exact mapping |
| --- | --- |
| Ledger request | Authoritative immutable request and digest |
| Ledger events | Authoritative intents, transitions, claims, links and terminals |
| Ledger snapshot | Replayable current-state cache |
| GitHub Deployment | One per attempt in source repo; exact `ref=source.sha`, environment, `task=deploy-hub/<environment>/<surface>/<unit>`, payload contains request ID/digest/attempt/ledger link |
| Deployment status | Projection of queued/in-progress/success/failure with UI/log link; not relied on for old history |
| Check Run | One per attempt on exact SHA; stable name by environment/unit, `external_id=<request-id>:<attempt>`, Deploy Hub UI details link |
| Workflow run | Canonical workflow execution and artifacts, correlated by immutable request ID/digest/attempt inputs |
| Task event | Versioned callback payload derived from the newly committed ledger event |

GitHub Deployment creation uses `auto_merge=false` and no branch substitution.
A projection failure appends a retryable projection warning and reconciliation
event; it does not roll back an accepted request or create a duplicate request.

## Restart and reconciliation

At startup and after ambiguous timeouts:

1. Read `state/v1` and validate the branch is a fast-forward descendant of the
   last trusted head when one exists.
2. Validate schemas, request digests, event IDs, exact sequence, event subject,
   legal transitions, and snapshot replay equality.
3. Derive deterministic queues and active mutation/validation claims.
4. Query linked GitHub Deployment, Check Run, workflow run and artifact state.
5. Query exact runtime proof for any attempt that may have crossed mutation.
6. Reconcile communication outcomes independently.
7. Append one `reconciled` event for a proven state or
   `reconciliation_required` and fail closed when evidence conflicts.

An API timeout after GitHub mutation is never retried blindly. Reconciliation
uses request ID, digest, attempt and projection IDs to decide whether the
external mutation already exists.

## Stale, moved, and duplicate rules

| Scenario | Required result |
| --- | --- |
| Identical request replay | Return same logical request/status, no event/projection |
| Same ID, different payload | `IDEMPOTENCY_CONFLICT`, no mutation |
| PR head moved before acceptance | Reject acceptance as `STALE_SOURCE` |
| PR head moved after acceptance, before mutation | Terminal `stale` |
| PR head moved after mutation | Continue proving accepted exact SHA; add informational warning only |
| Production `main` moved before mutation | Terminal `stale`; never deploy new main implicitly |
| Ref deleted but exact SHA still accepted before mutation | Fail stale unless policy explicitly allows immutable detached staging source; production always stale |
| Duplicate workflow callback | Same event identity/content is ignored; conflicting content for identity fails reconciliation |
| Process dies after ledger accept, before projections | Reconciler creates missing projections once |
| Process dies after external dispatch, before ledger link | Reconciler searches exact request ID/digest/attempt evidence before any new dispatch |
| Snapshot changes during E2E | Validation `failed/ENVIRONMENT_DRIFT`; deployment is deployed but validation failed |

## Ledger event and agent task delivery

`ledger-event.v1` is the authoritative event file committed on `state/v1`.
It records global and subject sequence, predecessor, immutable request digest,
attempt, producer, state/phase transition, event-specific payload, and durable
evidence. Terminal payloads carry truthful booleans for environment mutation,
runtime proof, and validation plus failure detail where applicable.

`task-event.v1` is a delivery envelope emitted only after that ledger commit
succeeds. It contains the initiating Codex task reference, exact state-branch
commit SHA and URL, and an unmodified embedded `ledger-event.v1`. It is safe to
redeliver and contains no callback secret.

- The embedded ledger `event_id` is the delivery dedupe identity.
- Subject kind/ID, digest, subject sequence, state version, and attempt let the
  task reject out-of-order or conflicting callbacks.
- Producer identifies Deploy Hub, the exact canonical workflow, reconciler, or
  communication pipeline.
- A receiving task verifies the named commit contains the exact event, then
  stores the highest contiguous subject sequence. Exact duplicates are
  acknowledged. Gaps trigger status resynchronization; conflicting duplicate
  event IDs fail closed.
- Delivery failure does not change deployment truth. The ledger event remains
  available for pull/resume and bounded redelivery.

Payload requirements by event family:

| Event | Required payload facts |
| --- | --- |
| `request_accepted` | environment, target, exact SHA, acceptance sequence and order key |
| `waiting` | resource keys and blocking owner IDs |
| `resource_claimed` / `validation_claimed` / `mutation_claimed` | claimed keys; the delivery envelope supplies the ledger commit |
| `workflow_linked` | exact workflow path, run ID/attempt/SHA/URL |
| `runtime_verified` | exact accepted SHA and proof URL |
| `snapshot_observed` | before/claim-recheck/after role and exact digest |
| `validation_linked` | validation ID and snapshot-before digest |
| `cancel_requested` / `retry_requested` | command ID, authority subject and reason |
| `communication_observed` | communication ID, channel, state, non-gating flag |
| terminal | complete `terminal_result` and durable evidence links |

## Communication provenance and outcome

The canonical workflow and backend communication pipeline own posting and
release-note generation. Deploy Hub only supplies immutable context and records
their observed outcome.

### Immutable provenance

The first outcome event fixes requester, authority, exact workflow, exact
source, optional GitHub Deployment ID, CI-drop contributors, and
per-PR release-note contributor sets. `provenance_digest` is repeated on later
events; a mismatch is a conflicting callback.

Contributor arrays are evidence-derived and may be empty with diagnostics.
They are never copied from requester/authority and never accepted from an
untrusted request.

### Outcome states

| Channel | Allowed progression |
| --- | --- |
| CI drop | `not_applicable` or `pending -> accepted | duplicate | failed` |
| Release note | `ineligible` or `pending -> enqueued -> published | already_published | skipped | failed` |

Every observation is a new immutable outcome event with stable
`communication_id`, unique `outcome_event_id`, and previous-event link. A
failure includes retryability and diagnostic. Retry creates another event; it
does not edit a previous outcome.

`non_gating` is always true. Pending or failed communication may add warnings
to deployment status, UI, Check Run and task events, but cannot hold a mutation
or validation claim and cannot change deployment success/failure.

The existing release-note queue/generator remains its own execution authority.
Deploy Hub's ledger stores observed lifecycle evidence, not a duplicate queue
or publication state machine.

## Contract fixtures

`fixtures/` contains normative scenarios:

| Fixture | Required behavior |
| --- | --- |
| `valid-deployment.json` | New staging request reaches succeeded only after exact runtime proof and snapshot validation |
| `duplicate-deployment.json` | Identical replay returns the stored request; conflicting digest returns 409 and no event |
| `stale-deployment.json` | Accepted exact PR head moves before mutation and ends stale without dispatching a replacement SHA |
| `cancelled-deployment.json` | Waiting request records cancel intent and terminal cancellation without environment mutation |
| `failed-deployment.json` | Runtime mutation completed but E2E product failure remains a truthful failed deployment with non-gating communication warning |
| `valid-validation.json` | Before/after environment snapshots match and all baseline packs succeed |
| `communication-outcome.json` | Requester, GitHub authority and evidence-derived contributors remain distinct while CI posting stays non-gating |
| `task-event-delivery.json` | One committed authoritative event is delivered verbatim with its exact ledger commit to the initiating Codex task |
| `error-response.json` | A safe, versioned idempotency conflict reports no ledger or external mutation |

Fixtures use obvious repeated placeholder SHAs/digests so reviewers can compare
identity propagation visually. They are not live repository evidence.

## Versioning

- No live producer or consumer exists yet. Owner-approved pre-implementation
  corrections may amend v1 when recorded in the changelog; ADR 0009's removal
  of the speculative App executor is such a correction. Freeze compatibility
  rules when Task 7 ships its first consumer.
- Additive optional fields require a documented compatible minor consumer
  policy but keep the v1 discriminator only if old consumers safely ignore
  them. Current schemas reject unknown fields, so producers must coordinate
  before adding fields.
- Removing a field, changing meaning, relaxing authority, altering digest
  input, or adding a state/transition requires v2.
- Readers reject unknown major schema versions and surface an explicit
  compatibility failure; they never guess.

## Work intentionally deferred

Task 2 specifies behavior; it does not create the state branch, PR feedback,
Deployments, workflows, credentials, UI, or environment access.
Task 3 owns permissions/threat modeling. Tasks 5 and 6 must prove these
contracts with fake and isolated GitHub adapters before any live mutation.
