# Deploy Hub Implementation Tracker

Last updated: 2026-08-03

This is the canonical top-level execution tracker. Stable task numbers are used
so a later conversation can ask, for example, `Have we completed Task 1?` and
receive an evidence-based answer.

## Tracker rules

- Status values are `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, and `DONE`.
- The default next task is the lowest-numbered non-done task whose dependencies
  are complete. Work may overlap only when explicitly useful and safe.
- A checkbox is a summary, not proof. Before answering whether a task is done,
  inspect every acceptance criterion and the exact evidence linked under that
  task.
- Mark a task `DONE` only when all acceptance criteria are met. Design or code
  without required validation, rollout evidence, or documentation is not done.
- Add durable evidence links to commits, files, PRs, workflow runs, deployed
  versions, or test artifacts. Do not use a conversation-only claim as
  evidence.
- Update this file, `STATUS.md`, and `CHANGELOG.md` in the same change that
  starts, blocks, unblocks, or completes a task.
- Never reinterpret an existing task number. If scope changes materially, add a
  new task or explicitly amend this tracker with a recorded reason.
- Direct documentation pushes to `main` are permitted only while the repository
  remains private and specification-only as recorded in `STATUS.md`.

## Summary

| Task | Deliverable | Status | Depends on |
| ---: | --- | --- | --- |
| 0 | Requirements and architecture baseline | DONE | — |
| 1 | Dormant-state and canonical-workflow inventory | DONE | 0 |
| 2 | Exact deployment, validation, and GitHub-state contracts | DONE | 1 |
| 3 | Authentication, permissions, and threat model | DONE | 1, 2 |
| 4 | Executable Deploy Hub skeleton | IN PROGRESS | 2, 3 |
| 5 | Fake adapters and deterministic contract suite | NOT STARTED | 4 |
| 6 | GitHub-native request ledger and idempotency | NOT STARTED | 2, 4 |
| 7 | Authenticated agent-facing API | NOT STARTED | 3, 6 |
| 8 | Scoped concurrency, waiting, and validation locks | NOT STARTED | 6, 7 |
| 9 | GitHub Deployments, Check Runs, and task events | NOT STARTED | 6, 7 |
| 10 | GitHub-backed static UI delivery | NOT STARTED | 3, 4, 7 |
| 11 | Live operational UI and history | NOT STARTED | 8, 9, 10 |
| 12 | Canonical frontend staging adapter | NOT STARTED | 5–9 |
| 13 | Canonical backend staging adapter | NOT STARTED | 5–9 |
| 14 | Mandatory staging environment-snapshot E2E | NOT STARTED | 12, 13 |
| 15 | Canonical frontend production adapter | NOT STARTED | 5–9, 12 |
| 16 | Canonical backend production adapter | NOT STARTED | 5–9, 13 |
| 17 | Mandatory production environment-snapshot E2E | NOT STARTED | 14–16 |
| 18 | Audit, metrics, estimates, and operational diagnostics | NOT STARTED | 8, 9, 11, 14, 17 |
| 19 | Cancellation, retry, reconciliation, and break-glass recovery | NOT STARTED | 8, 9, 12–17 |
| 20 | Permission-isolated frontend and backend shadow validation | NOT STARTED | 5–14, 19, 25 |
| 21 | Isolated real-execution canaries | NOT STARTED | 15–20 |
| 22 | Controlled shared-staging pilot and burn-in | NOT STARTED | 21 |
| 23 | Production pilot and Deploy Hub establishment | NOT STARTED | 22, 25 |
| 24 | Deferred Release Bus removal and cleanup | NOT STARTED | 23 |
| 25 | Deployment communications, attribution, and release-note integration | NOT STARTED | 2, 3, 5, 9, 11–19 |

## Task details

### [x] Task 0 — Requirements and architecture baseline

Status: `DONE`

Outcome: The project has an agreed product boundary, migration direction,
safety model, UI model, E2E and deployment-communications policies, and durable
implementation tracker.

Acceptance criteria:

- [x] Agent-owned lifecycle and atomic Deploy Hub operation boundary accepted.
- [x] Start-over migration and dormant Release Bus posture recorded.
- [x] Canonical frontend/backend deployment ownership recorded.
- [x] GitHub-native-first state, GitHub App auth, rollback, and fallback choices
  recorded.
- [x] GitHub-backed static UI and automatic live-update requirements recorded.
- [x] Mandatory staging and production environment-snapshot E2E accepted.
- [x] Repository-owned CI posting, exact attribution, and asynchronous
  production release-note boundary accepted.
- [x] Shadow-to-isolated-to-shared rollout strategy recorded.
- [x] Numbered implementation tracker established.

Evidence:

- `docs/requirements.md`
- `docs/architecture.md`
- `docs/migration-plan.md`
- `docs/testing-strategy.md`
- `docs/e2e-validation-analysis.md`
- `docs/deployment-communications-analysis.md`
- ADRs 0001 through 0005 under `docs/decisions/`

### [x] Task 1 — Dormant-state and canonical-workflow inventory

Status: `DONE`

Outcome: One exact, current inventory explains how deployments and E2E work
today and identifies every Release Bus dependency that must be retained,
generalized, or removed.

Scope:

- Authoritatively verify the current staging and production Release Bus posture
  without changing it.
- Inspect all four canonical deployment paths at current remote `main`.
- Inspect staging and production E2E triggers, inputs, evidence, concurrency,
  credentials, callbacks, and failure semantics.
- Reinspect backend PR #1869, frontend PR #3504, and source task
  `019faa0e-272b-7f62-843a-79fffb815a7e`; record final heads, merge/deploy
  status, and which changes are actually present on repository `main`.
- Trace current workflow readiness gates, environment locks, exact-version
  endpoints, GitHub Deployments, manual fallback, and the complete canonical
  workflow → notifier → CI-alert receiver → release-note queue/generator
  path.
- Inventory the existing backend hosting/auth/realtime capabilities relevant to
  the UI proxy, API, and live updates.
- Produce an exact change map per repository and workflow; do not implement it.

Acceptance criteria:

- [x] Inventory records the remote commit SHA inspected for every repository.
- [x] Each canonical path has trigger, inputs, mutation boundary, concurrency,
  runtime proof, output, and fallback documented.
- [x] Every Release Bus-specific dependency is named by file and purpose.
- [x] Deployment notification fields, authentication, contributor evidence,
  side-effect outcomes, release-note baselines, deduplication, and recovery are
  named by file and exact workflow path.
- [x] Backend-only, frontend-only, coordinated, staging, production, and E2E
  gaps are explicit.
- [x] No environment, workflow, branch, credential, or Release Bus control was
  mutated during the audit.
- [x] Follow-up requirements are separated from proposed implementation
  choices.

Evidence:

- `docs/current-system-inventory.md`
- Exact source and live-control snapshots recorded in that inventory on
  2026-08-03.

### [x] Task 2 — Exact deployment, validation, and GitHub-state contracts

Status: `DONE`

Outcome: Implementation-ready contracts define the smallest durable control
plane without a release train or database state machine.

Scope:

- Final request/status/cancel/retry deployment schemas.
- Final environment-snapshot validation schema and lifecycle.
- Exact GitHub-native representation for immutable request identity, waiting
  order, idempotency, cancellation intent, and terminal evidence.
- Stale-head, moved-main, duplicate, conflicting duplicate, and restart rules.
- Versioned event envelope for resuming the initiating Codex task.
- Immutable deployment-communication provenance and a versioned non-gating
  side-effect outcome envelope.

Acceptance criteria:

- [x] Every field, validation rule, state transition, and terminal result is
  specified.
- [x] Coordinated operations remain agent-owned and do not become trains.
- [x] State can be reconstructed after process loss from named durable evidence.
- [x] Competing requests have deterministic waiting order and ownership.
- [x] Contract fixtures cover valid, duplicate, stale, cancelled, and failed
  examples.
- [x] Requester, authenticated authority, CI-drop contributors, and per-PR
  release-note contributors are represented as separate identities.
- [x] An accepted ADR records the chosen GitHub-native representation.

Evidence:

- `docs/contracts/README.md`
- Fourteen strict JSON Schema 2020-12 contracts and nine fixtures under
  `docs/contracts/`
- `docs/decisions/0006-git-ledger-control-records.md`
- Completion audit on 2026-08-03: all schema and fixture JSON parsed; all
  schemas compiled in strict mode; 12 schema-backed fixture objects validated;
  unauthorized production, success without validation, contradictory terminal
  failure, gating communication, broken event predecessor, and acceptance
  without exact source were rejected.

### [x] Task 3 — Authentication, permissions, and threat model

Status: `DONE`

Outcome: Human, Codex, backend, GitHub, and environment authority is explicit,
least-privilege, and staged by rollout phase.

Scope:

- Organization-owned GitHub App identity and installation model.
- Caller authentication and authorization for staging, production, retry, and
  cancellation.
- Permissions matrix for offline, read-only shadow, writable shadow, isolated,
  staging, and production phases.
- Private UI-file access, browser authentication, webhook verification, secret
  handling, and audit attribution.
- Abuse cases: forged callbacks, replay, moved refs, confused deputy,
  cross-repository escalation, unauthorized production intent, spoofed Release
  Train/Deploy Hub identity, and caller-supplied contributor claims.

Acceptance criteria:

- [x] Every permission is mapped to a feature and rollout phase.
- [x] Read-only shadow is physically unable to dispatch or mutate.
- [x] Production authority is explicit, attributable, and request-bound.
- [x] Secrets never enter UI payloads, Check Runs, records, or logs.
- [x] Threats and mitigations receive security review before credentials exist.

Evidence:

- `docs/security-model.md`
- `docs/decisions/0007-authentication-permissions-and-live-transport.md`
- `docs/diagrams/security-trust-boundaries.mmd`
- Task 3 acceptance audit on 2026-08-03: the permission-to-feature table and
  rollout matrix cover every requested App capability; read-only shadow has no
  write/AWS credential and requires negative capability tests; production
  requires current role, scope, explicit action, atomic exact-request
  authorization, and a pre-mutation recheck; the secret inventory and canary
  test policy exclude credentials from every visible/durable surface; 26 abuse
  cases were reviewed before any credential or live permission existed.

### [ ] Task 4 — Executable Deploy Hub skeleton

Status: `IN PROGRESS`

Outcome: The repository contains the minimal production-quality application
structure needed for API, static UI, adapters, and tests, with no deployment
authority.

Acceptance criteria:

- [ ] Runtime and package choices are recorded with a concise rationale.
- [ ] API, domain, adapter, GitHub, UI, configuration, and test boundaries are
  explicit.
- [ ] Local build, lint, type, unit-test, and formatting commands are defined.
- [ ] Safe sample configuration contains no secrets.
- [ ] CI validates the repository without deployment credentials or mutation.
- [ ] The approved direct-to-`main` credentialless workflow and remote-head
  safety checks are documented; protected-main/PR workflow remains a mandatory
  reconsideration before any credential or deployment authority.
- [ ] README and agent instructions explain how to develop and verify it.

2026-08-03 workflow amendment: the repository owner explicitly retained direct
pushes to `main` for the current private, credentialless bootstrap. Enforced
protection is deferred rather than required by Task 4; it must be reconsidered
before any credential, live permission, deployment authority, or additional
write actor is introduced.

Progress evidence:

- `docs/decisions/0008-keep-the-executable-skeleton-small.md`
- `package.json`, `tsconfig*.json`, `eslint.config.mjs`, and
  `.prettierrc.json`
- `src/`, `ui/`, and `test/skeleton.test.ts`
- `.env.example` and `.github/workflows/ci.yml`
- Local `npm run check` on 2026-08-03: formatting, lint, type checking, build,
  and four unit tests passed. Completion remains pending the first exact-head
  GitHub CI result and final acceptance audit.

### [ ] Task 5 — Fake adapters and deterministic contract suite

Status: `NOT STARTED`

Outcome: Deploy Hub behavior can be developed and proven end-to-end without
GitHub writes, AWS access, or shared-environment mutation.

Acceptance criteria:

- [ ] Fake frontend/backend deploy and E2E adapters support success, delay,
  product failure, infrastructure failure, cancellation, and stale outcomes.
- [ ] Fake communication sinks support CI-drop acceptance/failure and
  production release-note enqueue/publish/skip/failure without real posts.
- [ ] A deterministic clock and event fixtures make retries reproducible.
- [ ] Contract tests cover every operation state and transition.
- [ ] Duplicate dispatch and duplicate/conflicting callback scenarios are
  proven safe.
- [ ] Test configuration is physically incapable of live mutation.

Evidence: Not yet available.

### [ ] Task 6 — GitHub-native request ledger and idempotency

Status: `NOT STARTED`

Outcome: Accepted requests, validation records, waiting order, and terminal
evidence are durable and reconstructable without a database or S3 ledger.

Acceptance criteria:

- [ ] Identical request ID/payload returns one logical operation.
- [ ] Conflicting payload reuse fails closed.
- [ ] Waiting ownership survives restart and has deterministic order.
- [ ] Accepted immutable SHA never silently follows a branch.
- [ ] Reconciliation rebuilds state from GitHub evidence after interruption.
- [ ] Retention and audit-history behavior are documented and tested.

Evidence: Not yet available.

### [ ] Task 7 — Authenticated agent-facing API

Status: `NOT STARTED`

Outcome: Codex tasks and authorized humans can request, inspect, cancel, retry,
and validate exact deployments through a stable machine-facing API.

Acceptance criteria:

- [ ] Deployment and validation endpoints implement the accepted contracts.
- [ ] Authentication, authorization, input validation, and attribution fail
  closed.
- [ ] Every response identifies the request, exact source, environment, state,
  and durable evidence links.
- [ ] Production intent cannot be inferred from staging intent.
- [ ] API compatibility/versioning policy and OpenAPI contract are documented.

Evidence: Not yet available.

### [ ] Task 8 — Scoped concurrency, waiting, and validation locks

Status: `NOT STARTED`

Outcome: Only operations that compete for the same real mutation or validation
resource block each other.

Acceptance criteria:

- [ ] Frontend and backend work is not globally serialized.
- [ ] Backend services serialize only where concrete incompatibility requires
  it.
- [ ] Staging and production locks are independent.
- [ ] Environment-snapshot E2E blocks mutation only to the same environment.
- [ ] Waiting reason, owner, order, and estimated duration are visible.
- [ ] Lock loss, stale owner, restart, and cancellation behavior are tested.

Evidence: Not yet available.

### [ ] Task 9 — GitHub Deployments, Check Runs, and task events

Status: `NOT STARTED`

Outcome: Every exact operation reports useful real-time progress to its PR and
can resume the correct initiating Codex task.

Acceptance criteria:

- [ ] One Check Run per exact SHA/target exposes state, blocker, request ID,
  workflow, UI link, validation, and terminal conclusion.
- [ ] GitHub Deployment records preserve environment and exact version history.
- [ ] Moved PR heads are visibly stale without rewriting accepted identity.
- [ ] Terminal task events are attributable, idempotent, and resumable.
- [ ] Non-gating CI-drop and release-note milestone events are linked to the
  exact deployment without changing its terminal truth.
- [ ] Missed or duplicate event delivery is recoverable from GitHub truth.

Evidence: Not yet available.

### [ ] Task 10 — GitHub-backed static UI delivery

Status: `NOT STARTED`

Outcome: The existing backend securely serves the UI owned by
`deploy-hub/main` without copying UI source or artifacts into the backend repo.

Acceptance criteria:

- [ ] `/deploy/ui/hub` requires authenticated access.
- [ ] The proxy resolves `deploy-hub/main` to one exact SHA per release and
  never mixes assets from different commits.
- [ ] Commit-addressed assets are cached safely and a new main SHA switches
  atomically.
- [ ] Private GitHub credentials remain server-side and least-privilege.
- [ ] UI source SHA is visible and a missing UI cannot break deployment APIs.
- [ ] UI release and rollback do not require backend deployment.

Evidence: Not yet available.

### [ ] Task 11 — Live operational UI and history

Status: `NOT STARTED`

Outcome: An already-open browser shows current environments, new operations,
queues, blockers, progress, validation, history, retry, and cancellation
without manual refresh.

Acceptance criteria:

- [ ] Initial state comes from an authoritative authenticated snapshot.
- [ ] Live events normally update visible state within two seconds.
- [ ] Reconnect resynchronizes before applying new events.
- [ ] Automatic polling at no more than five-second intervals covers stream
  failure.
- [ ] Duplicate/out-of-order events cannot regress the UI.
- [ ] UI shows exact versions, request/PR/task identity, elapsed time, ETA,
  workflow links, and scoped waiting reason.
- [ ] UI shows CI-drop and production release-note milestones, warnings, links,
  and recovery evidence separately from deployment and E2E state.
- [ ] Authorization is enforced by APIs, never by hidden/disabled controls.

Evidence: Not yet available.

### [ ] Task 12 — Canonical frontend staging adapter

Status: `NOT STARTED`

Outcome: Deploy Hub safely integrates an exact frontend source into
`1a-staging` and observes the canonical `deploy-staging.yml` path.

Acceptance criteria:

- [ ] Exact source and current `1a-staging` are re-resolved before non-force
  integration.
- [ ] A push-triggered canonical workflow is used; no duplicate manual dispatch
  is created.
- [ ] Build/deploy failure and exact runtime identity are reported correctly.
- [ ] A moved source or staging ref fails/replans safely.
- [ ] The adapter does not duplicate frontend build or deployment logic.
- [ ] Manual canonical fallback remains documented and usable.

Evidence: Not yet available.

### [ ] Task 13 — Canonical backend staging adapter

Status: `NOT STARTED`

Outcome: Deploy Hub dispatches exact selected backend services through
`deploy.yml` without rebuilding or deploying unrelated services.

Acceptance criteria:

- [ ] Request binds exact SHA, environment, and allowlisted service set.
- [ ] Service dependencies and safe concurrency are explicit.
- [ ] Unaffected services are not built or deployed.
- [ ] API health and exact version are verified where applicable.
- [ ] Per-service terminal evidence and failure attribution are preserved.
- [ ] Manual canonical fallback remains documented and usable.

Evidence: Not yet available.

### [ ] Task 14 — Mandatory staging environment-snapshot E2E

Status: `NOT STARTED`

Outcome: Every requested staging outcome receives one exact mandatory baseline
read-only E2E result after all intended components are deployed.

Acceptance criteria:

- [ ] Generic validation inputs replace Release Bus train/manifest coupling.
- [ ] Frontend-only, backend-only, and coordinated deployments are supported.
- [ ] The exact frontend SHA and backend versions by service are verified before
  and after the run.
- [ ] All 12 baseline staging packs are required; partial diagnostic runs cannot
  satisfy the gate.
- [ ] Coordinated operations share one result instead of duplicating suites.
- [ ] Product and infrastructure failures have distinct retry semantics.
- [ ] Same-environment mutation waits only for the validation window.

Evidence: Not yet available.

### [ ] Task 15 — Canonical frontend production adapter

Status: `NOT STARTED`

Outcome: An explicitly authorized exact frontend `main` SHA deploys through
`build-upload-deploy-prod.yml` with no Release Bus composition logic.

Acceptance criteria:

- [ ] Production authority, exact SHA, and current `main` identity are rechecked
  immediately before mutation.
- [ ] Canonical build/upload/deploy behavior remains repository-owned.
- [ ] Exact runtime version and health are proven.
- [ ] Failure reports the irreversible boundary and current runtime truth.
- [ ] Manual canonical production fallback remains documented and usable.

Evidence: Not yet available.

### [ ] Task 16 — Canonical backend production adapter

Status: `NOT STARTED`

Outcome: Explicitly authorized backend services deploy exact `main` through
`deploy.yml` with correct ordering, version proof, and release-note behavior.

Acceptance criteria:

- [ ] Exact source, selected services, dependencies, and production authority
  are verified before mutation.
- [ ] Only affected services build/deploy.
- [ ] Per-service health/version evidence is recorded where available.
- [ ] Multi-service release-note grouping/publish behavior remains correct.
- [ ] Partial failure records what changed and what did not.
- [ ] Manual canonical production fallback remains documented and usable.

Evidence: Not yet available.

### [ ] Task 17 — Mandatory production environment-snapshot E2E

Status: `NOT STARTED`

Outcome: Every requested production outcome receives terminal green
production-safe E2E bound to the exact deployed environment.

Acceptance criteria:

- [ ] Generic Deploy Hub validation dispatch replaces Release Bus-only inputs.
- [ ] All 11 production-safe baseline packs are mandatory and read-only.
- [ ] Exact runtime snapshot is verified before and after testing.
- [ ] Production is not reported successful before E2E succeeds.
- [ ] Product failure blocks later production mutation pending reconciliation;
  infrastructure retry remains bounded and identity-preserving.
- [ ] Staging activity remains independent.

Evidence: Not yet available.

### [ ] Task 18 — Audit, metrics, estimates, and operational diagnostics

Status: `NOT STARTED`

Outcome: Operators and agents can understand what happened, how long it should
take, and where a delay or failure lives without reading raw logs first.

Acceptance criteria:

- [ ] Audit history attributes requester, task, PR, SHA, service, environment,
  authorization, workflow, runtime version, validation, timestamps, and result.
- [ ] UI estimates use rolling observed history by operation type/environment.
- [ ] Initial E2E estimates begin near seven minutes staging and four minutes
  production, then adapt from evidence.
- [ ] Slow-run warnings do not automatically cancel valid work.
- [ ] Structured failure classes distinguish source, policy, deployment,
  product E2E, infrastructure, and control-plane failures.
- [ ] Diagnostic links reach the exact GitHub run and evidence artifact.
- [ ] Diagnostics distinguish CI-drop acceptance, attribution omission,
  release-note ineligibility, enqueue, skip, deduplication, publication, queue
  failure, and generation failure.

Evidence: Not yet available.

### [ ] Task 19 — Cancellation, retry, reconciliation, and break-glass recovery

Status: `NOT STARTED`

Outcome: Interrupted and failed operations recover safely without duplicate
deployments or fabricated success.

Acceptance criteria:

- [ ] Waiting and running cancellation semantics are explicit and tested.
- [ ] Retry preserves logical identity and never substitutes a newer SHA.
- [ ] Restart and missed-webhook recovery reconcile GitHub and runtime truth.
- [ ] Direct workflow cancellation and partial deployment are represented
  truthfully.
- [ ] Known-good exact redeployment is documented for staging and production.
- [ ] Manual canonical break-glass paths are proven independently.
- [ ] Communication replay and recovery cannot duplicate a CI drop or release
  note and never require redeploying the application.
- [ ] No automatic cross-repository rollback is introduced.

Evidence: Not yet available.

### [ ] Task 20 — Permission-isolated frontend and backend shadow validation

Status: `NOT STARTED`

Outcome: Real repository identities and workflows exercise the control plane
without any ability to change shared refs, environments, or AWS resources.

Acceptance criteria:

- [ ] Long-lived frontend `1a-deploy-hub` accepts only allowlisted test PRs and
  triggers only a credentialless shadow workflow.
- [ ] Backend shadow uses exact PR SHAs and simulated selected services.
- [ ] Shadow identity cannot update `1a-staging`/`main`, dispatch real deploys,
  assume staging/production roles, or publish real CI/release-note drops.
- [ ] Initial Check Runs are projected; later writes target only opted-in test
  PRs.
- [ ] Success, failure, waiting, duplicate, stale, cancel, retry, callbacks, UI,
  and restart reconstruction are exercised.
- [ ] Shadow results are never presented as real deployment evidence.

Evidence: Not yet available.

### [ ] Task 21 — Isolated real-execution canaries

Status: `NOT STARTED`

Outcome: Real cloud mutation, health, exact-version proof, E2E, failure, and
recovery are proven without risking colleagues' shared staging work.

Acceptance criteria:

- [ ] An isolated frontend environment proves the frontend path.
- [ ] An isolated backend-capable environment proves selected service paths.
- [ ] Exact runtime identities and environment-snapshot E2E are proven.
- [ ] Concurrent frontend/unrelated backend scenarios behave as designed.
- [ ] Failure, retry, cancellation, stale, missed-event, and recovery drills pass.
- [ ] Isolated credentials cannot mutate shared staging or production.

Evidence: Not yet available.

### [ ] Task 22 — Controlled shared-staging pilot and burn-in

Status: `NOT STARTED`

Outcome: Opted-in real work uses Deploy Hub on shared staging without blocking
or endangering colleagues outside the documented short mutation/validation
windows.

Acceptance criteria:

- [ ] Frontend-only, backend-only, and coordinated canaries succeed.
- [ ] Baseline E2E binds exact environment snapshots.
- [ ] Frontend and unrelated backend work are not globally serialized.
- [ ] Waiting, UI, Check Runs, task events, retry, cancel, and failure behavior
  match authoritative GitHub/runtime truth.
- [ ] Staging CI drops show exact Deploy Hub authority/requester/contributor
  attribution and remain release-note-ineligible.
- [ ] A burn-in window and success/failure acceptance record are complete.
- [ ] Manual canonical staging remains immediately usable.

Evidence: Not yet available.

### [ ] Task 23 — Production pilot and Deploy Hub establishment

Status: `NOT STARTED`

Outcome: Low-risk frontend and backend production releases prove the complete
agent-to-production path, after which Deploy Hub becomes the normal entry point.

Acceptance criteria:

- [ ] Explicitly authorized low-risk backend and frontend pilots succeed.
- [ ] Exact runtime proof and production-safe E2E are terminal and green.
- [ ] Frontend and backend CI drops and production release notes have exact
  authority, requester, PR, contributor, service, and release-group scope.
- [ ] Release-note publication, skip, deduplication, and failure are visible and
  do not alter healthy deployment/E2E truth.
- [ ] At least one production failure/recovery or controlled equivalent is
  proven without fabricating success.
- [ ] Codex deployment tooling routes normal requests to Deploy Hub.
- [ ] Manual canonical production remains documented and usable.
- [ ] Establishment decision and burn-in evidence are recorded.

Evidence: Not yet available.

### [ ] Task 24 — Deferred Release Bus removal and cleanup

Status: `NOT STARTED`

Outcome: After Deploy Hub is established, obsolete Release Bus code,
infrastructure, permissions, workflows, UI, docs, and operator tooling are
removed without losing required audit history.

Acceptance criteria:

- [ ] Required audit history is exported and retained.
- [ ] Candidate/train/manifest/operation/lock/control APIs, DB state, UI, and
  reconciler scheduling are removed.
- [ ] Release Bus-specific frontend workflows and backend workflow inputs,
  callbacks, guards, credentials, alarms, and AWS resources are removed.
- [ ] Release Train authority and train/operation notification contracts are
  removed only after canonical Deploy Hub/manual CI posting and release notes
  pass acceptance.
- [ ] Canonical manual and Deploy Hub paths no longer import or call Release Bus.
- [ ] Obsolete docs, skills, and terminology are removed or archived.
- [ ] Staging and production deployment/E2E paths pass final acceptance without
  Release Bus infrastructure.

Evidence: Not yet available.

### [ ] Task 25 — Deployment communications, attribution, and release-note integration

Status: `NOT STARTED`

Outcome: Every canonical Deploy Hub deployment reuses the existing
repository/backend communications pipeline to produce correctly attributed CI
drops and production release notes with observable, idempotent, non-gating
outcomes.

Scope:

- Finalize the Deploy Hub authority and immutable notification evidence
  contract using the source task and PRs as implementation input.
- Preserve repository-owned contributor derivation, backend CI-alert rendering,
  production eligibility, queue/generator, deduplication, and publication.
- Integrate communication outcomes into adapters, Check Runs, task events,
  audit history, recovery, and the live UI.
- Preserve explicit no-PR/internal/recovery behavior and backend multi-service
  release grouping.
- Remove Release Bus-specific identity assumptions without discarding the
  secure attribution and release-note behavior they helped establish.

Acceptance criteria:

- [ ] Backend PR #1869 and frontend PR #3504 final disposition is recorded, and
  the implementation uses only behavior verified on the exact deployed/main
  heads rather than assuming open-PR code exists.
- [ ] `Deploy Hub` is authenticated as its own authority and cannot be spoofed
  by workflow inputs, train-like strings, requester fields, or contributor
  metadata.
- [ ] Requester, authority, operation-scoped CI contributors, and per-PR
  release-note contributors remain separate and correctly attributed.
- [ ] Frontend contributor evidence is bounded to exact workflow/run/ref/SHA
  and deployed-range/PR evidence; backend evidence is exact-PR and
  service-scoped.
- [ ] Evidence timeout or unavailability omits contributors with a diagnostic
  but does not prevent the CI deployment drop.
- [ ] All four canonical deployment adapters produce exact, idempotent CI-drop
  outcomes; staging never requests a release note.
- [ ] Frontend production selects only approved exact production baselines and
  safely handles historical manual/Release Bus transitions and same-SHA
  redeployment.
- [ ] Backend production preserves per-PR contributors and one immutable
  multi-service release group that publishes only after its intended service
  set completes.
- [ ] Duplicate, rollback, recovery, unsafe-range, explicit no-PR, queue
  failure, generation failure, already-published, and successful publication
  outcomes are covered and truthful.
- [ ] Communication milestones update the UI, Check Run, audit history, and
  originating task without holding environment locks or changing deployment
  and E2E terminal truth.
- [ ] Shadow and fake modes are physically unable to publish real CI or
  release-note drops.
- [ ] Focused cross-repository contract tests and isolated/canary evidence prove
  backend-first compatibility and canonical manual fallback.

Input evidence:

- `docs/deployment-communications-analysis.md`
- ADR 0005 under `docs/decisions/`
- Source task `019faa0e-272b-7f62-843a-79fffb815a7e`
- [Backend PR #1869](https://github.com/6529-Collections/6529seize-backend/pull/1869)
- [Frontend PR #3504](https://github.com/6529-Collections/6529seize-frontend/pull/3504)

Completion evidence: Not yet available.

## Current next task

Task 4 — Executable Deploy Hub skeleton.
