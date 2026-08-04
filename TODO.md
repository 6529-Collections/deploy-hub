# Deploy Hub Implementation Tracker

Last updated: 2026-08-04

This is the canonical top-level execution tracker. Stable task numbers are used
so a later conversation can ask, for example, `Have we completed Task 1?` and
receive an evidence-based answer.

## Tracker rules

- Status values are `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, and `DONE`.
- The default next task is the lowest-numbered `NOT STARTED` or `IN PROGRESS`
  task whose active dependencies are complete. Work may overlap only when
  explicitly useful and safe.
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
- Task numbers describe the current implementation plan. Removed ideas do not
  remain as placeholder tasks.
- Direct pushes to `main` remain owner-approved for the private static-app
  bootstrap. Reconsider protection before adding GitHub mutation capability,
  deployment authority, a repository secret, or another write actor.

The tracker itself is the design gate. A task may add only the smallest
mechanism required by its acceptance criteria. A live ledger, database, queue,
scheduler, reconciler, callback service, second backend runtime, GitHub App,
SSE, or WebSocket is excluded unless a later concrete failure proves that the
existing GitHub/backend primitives cannot meet a requirement.

## Summary

| Task | Deliverable | Status | Depends on |
| ---: | --- | --- | --- |
| 0 | Requirements and architecture baseline | DONE | — |
| 1 | Dormant-state and canonical-workflow inventory | DONE | 0 |
| 2 | Authentication, permissions, and threat model | DONE | 1 |
| 3 | Repository tooling and static UI foundation | DONE | 2 |
| 4 | Static GitHub authentication | DONE | 2, 3 |
| 5 | Canonical workflow concurrency and waiting visibility | NOT STARTED | 1, 4 |
| 6 | PR feedback and GitHub run lookup | NOT STARTED | 4 |
| 7 | Portable static UI publishing | NOT STARTED | 3, 4 |
| 8 | Live operational UI and history | NOT STARTED | 5–7 |
| 9 | Canonical frontend staging adapter | NOT STARTED | 1, 4–6 |
| 10 | Canonical backend staging adapter | NOT STARTED | 1, 4–6 |
| 11 | Staging environment-snapshot E2E phase | NOT STARTED | 9, 10 |
| 12 | Canonical frontend production adapter | NOT STARTED | 1, 4–6, 9 |
| 13 | Canonical backend production adapter | NOT STARTED | 1, 4–6, 10 |
| 14 | Production environment-snapshot E2E phase | NOT STARTED | 11–13 |
| 15 | Simple operational diagnostics | NOT STARTED | 6, 8, 11, 14 |
| 16 | Agent operations, cancellation, retry, and recovery | NOT STARTED | 5, 6, 9–14 |
| 17 | Reuse deployment communications and release-note links | NOT STARTED | 2, 6, 9–16 |
| 18 | Credentialless opt-in shadow validation | NOT STARTED | 2, 4–17 |
| 19 | Controlled real-execution canaries | NOT STARTED | 12–18 |
| 20 | Controlled shared-staging pilot and burn-in | NOT STARTED | 19 |
| 21 | Production pilot and Deploy Hub establishment | NOT STARTED | 20 |
| 22 | Deferred Release Bus removal and cleanup | NOT STARTED | 21 |

## Requirement coverage

| Required outcome | Owning tasks |
| --- | --- |
| Codex can take a feature to staging or production | 9–17, 21 |
| Use the canonical frontend/backend deployment paths | 9, 10, 12, 13 |
| Frontend and unrelated backend work do not block each other | 5, 11, 14, 20 |
| Live PR feedback and no-refresh UI | 6, 8 |
| GitHub authentication and authoritative mutation permissions | 2, 4, 5 |
| Mandatory staging and production snapshot E2E | 11, 14 |
| Correct CI posts and production release notes | 17 |
| Safe shadow, canary, and colleague-safe rollout | 18–21 |
| Release Bus removal after Deploy Hub is proven | 22 |

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
- [x] GitHub workflow/run/runtime-derived state, existing GitHub-token auth, rollback, and
  fallback choices recorded.
- [x] GitHub-backed static UI and automatic live-update requirements recorded.
- [x] Mandatory staging and production environment-snapshot E2E accepted.
- [x] Repository-owned CI posting, exact attribution, and asynchronous
  production release-note boundary accepted.
- [x] Offline-to-shadow-to-controlled-canary rollout recorded; isolated cloud
  infrastructure is conditional on a demonstrated testing gap.
- [x] Numbered implementation tracker established.

Evidence:

- `docs/requirements.md`
- `docs/architecture.md`
- `docs/migration-plan.md`
- `docs/testing-strategy.md`
- `docs/e2e-validation-analysis.md`
- `docs/deployment-communications-analysis.md`
- ADRs under `docs/decisions/`

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
- Confirm that Deploy Hub needs no backend hosting, authentication, or realtime
  service.
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

### [x] Task 2 — Authentication, permissions, and threat model

Status: `DONE`

Outcome: Human, Codex, GitHub, and environment authority is explicit,
least-privilege, and staged by rollout phase.

Scope:

- Existing GitHub Bearer-token authentication for humans and Codex agents.
- Caller authorization for staging, production, retry, and cancellation.
- Minimum permissions for credentialless shadow and later live adapter phases.
- Private UI-file access, browser token handling, secret handling, and audit
  attribution.
- Abuse cases: invalid/revoked tokens, moved refs, confused deputy,
  cross-repository escalation, unauthorized production intent, spoofed Release
  Train identity, and caller-supplied contributor claims.

Acceptance criteria:

- [x] Every currently proposed permission is mapped to a feature and rollout
  phase; speculative App/OAuth/WebSocket/callback permissions are excluded.
- [x] Read-only shadow is physically unable to dispatch or mutate.
- [x] Production authority is explicit, attributable, and request-bound.
- [x] Secrets never enter UI payloads, Check Runs, records, or logs.
- [x] Threats and mitigations receive security review before credentials exist.

Evidence:

- `docs/security-model.md`
- ADR 0005 (`docs/decisions/0005-portable-static-app.md`)
- `docs/diagrams/security-trust-boundaries.mmd`
- Direct GitHub identity, operator membership, explicit production intent, and
  a pre-mutation exact-SHA recheck are required; token canary tests exclude the
  credential from visible or durable surfaces.

### [x] Task 3 — Repository tooling and static UI foundation

Status: `DONE`

Outcome: This repository has the small development toolchain, read-only CI,
documentation, and plain static UI shell it needs. It owns the whole portable
Deploy Hub app and has no API server or deployment runtime.

Acceptance criteria:

- [x] Package and plain static UI choices are recorded with a concise
  rationale.
- [x] Local formatting and lint commands are defined.
- [x] CI validates the repository without deployment credentials or mutation.
- [x] No second API server, runtime dependency, credential, or deployment
  adapter exists in this repository.
- [x] The approved direct-to-`main` credentialless workflow and remote-head
  safety checks are documented; protected-main/PR workflow remains a mandatory
  reconsideration before any credential or deployment authority.
- [x] README and agent instructions explain how to develop and verify it.

2026-08-03 workflow amendment: the repository owner explicitly retained direct
pushes to `main` for the current private static-app bootstrap. Enforced
protection must be reconsidered before GitHub mutation capability, deployment
authority, a repository secret, or another write actor is introduced.

Evidence:

- `package.json`, `eslint.config.mjs`, `.prettierrc.json`, `ui/`, and
  `.github/workflows/ci.yml`
- Commit `a84041a226affd6b8e1e34aa04dd840cd1e2256d`.
- GitHub Actions run
  `https://github.com/6529-Collections/deploy-hub/actions/runs/30818122104`
  passed on that exact head with read-only `contents` permission and no secrets.
### [x] Task 4 — Static GitHub authentication

Status: `DONE`

Repository boundary: all implementation is in `deploy-hub`. The page works
from any ordinary static host and calls GitHub directly. No backend repository,
proxy API, or Deploy Hub server is involved.

Outcome: A human can connect the static page with an existing GitHub token, and
Codex continues to use its existing GitHub authentication directly.

Acceptance criteria:

- [x] The browser sends the supplied token directly to GitHub `/user` and
  derives the login from GitHub.
- [x] Active organization-admin or existing deployment-operator team
  membership is required.
- [x] The token is stored only in the page origin's `localStorage`; a visible
  forget action removes it.
- [x] Missing, invalid, insufficiently scoped, and non-operator tokens fail
  closed with fixed messages that never echo GitHub response content.
- [x] The static app uses no third-party scripts and restricts connections to
  GitHub with CSP.
- [x] Token-canary tests prove the token is absent from returned identity and
  errors.
- [x] Codex needs no Deploy Hub credential or auth flow.
- [x] No backend/proxy API, Lambda, OAuth service, GitHub App, database, ledger,
  queue, scheduler, callback system, SSE, or WebSocket is introduced.
- [x] Focused tests, lint, formatting, and exact-head CI pass.

Evidence:

- `ui/github-auth.js`
- `ui/app.js`
- `test/github-auth.test.js`
- ADR 0005 (`docs/decisions/0005-portable-static-app.md`)
- Commit `c2bbb7a5458ef6c556b7f70447dc75fe2d03de06`
- Exact-head GitHub Actions run
  `https://github.com/6529-Collections/deploy-hub/actions/runs/30827998834`
  passed formatting, lint, and all eight focused tests.
- GitHub API response audit confirmed `access-control-allow-origin: *` for
  direct cross-origin browser use.

### [ ] Task 5 — Canonical workflow concurrency and waiting visibility

Status: `NOT STARTED`

Outcome: Existing GitHub Actions concurrency prevents conflicting mutations,
while independent frontend/backend work remains independent.

Acceptance criteria:

- [ ] Frontend and backend work is not globally serialized.
- [ ] Backend services serialize only where concrete incompatibility requires
  it.
- [ ] Staging and production concurrency groups are independent.
- [ ] GitHub repository, workflow, ref, and environment protections enforce
  mutation authority; bypassing the static page cannot bypass authorization.
- [ ] Duplicate concurrent dispatch is exercised against the canonical
  workflow; add no extra guard unless GitHub concurrency permits duplicate
  environment mutation.
- [ ] GitHub's queued/in-progress run state and concurrency group supply the
  waiting reason shown by API and UI.
- [ ] No Deploy Hub lock table, lease, heartbeat, queue, or scheduler exists.
- [ ] If E2E sees the environment snapshot change, it fails stale and reruns;
  Deploy Hub does not hold a long cross-repository environment lock.

Evidence: Not yet available.

### [ ] Task 6 — PR feedback and GitHub run lookup

Status: `NOT STARTED`

Outcome: Every operation is discoverable from its exact GitHub run, and the PR
shows useful progress without a second state system.

Acceptance criteria:

- [ ] Assess workflow checks and commit statuses before adding a GitHub App for
  rich Check Runs; use the smallest surface that meets PR-feedback needs.
- [ ] Existing workflow checks are used first; add one commit status only if
  the canonical check does not provide enough PR feedback.
- [ ] A narrow GitHub App Check Run is permitted only after both simpler
  surfaces are demonstrated insufficient.
- [ ] PR feedback links to the exact run and UI operation view and shows target,
  exact SHA, current phase, blocker, validation, and conclusion.
- [ ] GitHub Deployments are not an MVP dependency.
- [ ] Moved PR heads are visibly stale without rewriting accepted identity.
- [ ] The initiating task recovers status by operation/run ID; no task callback
  or event-delivery system is introduced.
- [ ] CI-drop and release-note links never change deployment/E2E truth.

Evidence: Not yet available.

### [ ] Task 7 — Portable static UI publishing

Status: `NOT STARTED`

Outcome: One internally consistent static release can be published and rolled
back on any ordinary static host without a backend deployment.

Acceptance criteria:

- [ ] The chosen host serves one exact HTML/CSS/JavaScript release without
  mixing assets.
- [ ] The approved release is served from a trusted HTTPS origin and identifies
  its exact source commit.
- [ ] The app works without a Deploy Hub backend or GitHub proxy.
- [ ] Hosting receives no GitHub token from application code.
- [ ] UI source version is visible.
- [ ] Release and rollback require only selecting a known static release.
- [ ] Hosting failure cannot break canonical manual workflows.

Evidence: Not yet available.

### [ ] Task 8 — Live operational UI and history

Status: `NOT STARTED`

Outcome: An already-open browser shows current environments, new operations,
GitHub waiting state, blockers, progress, validation, recent history, retry,
and cancellation without manual refresh.

Acceptance criteria:

- [ ] State comes directly from relevant GitHub workflow/check/artifact reads.
- [ ] Polling updates visible state at least every five seconds without manual
  refresh.
- [ ] The next successful complete GitHub read repairs any missed/failed poll
  without event replay, cursors, or resynchronization machinery.
- [ ] Conditional GitHub requests keep unchanged polling cheap.
- [ ] WebSocket/SSE transport is absent unless measured polling behavior proves
  it necessary.
- [ ] UI shows exact versions, request/PR/task identity, elapsed time, workflow
  links, and GitHub's waiting reason. ETA is optional until useful measured
  history exists.
- [ ] UI shows CI-drop and production release-note milestones, warnings, links,
  and recovery evidence separately from deployment and E2E state.
- [ ] Authorization is enforced by GitHub permissions and canonical workflows,
  never by hidden/disabled controls or other client-only checks.
- [ ] Recent history is explicitly bounded by GitHub retention; no duplicate
  archive is added unless that bound proves insufficient.
- [ ] No client event log, cursor protocol, SSE, or WebSocket is built for the
  MVP.

Evidence: Not yet available.

### [ ] Task 9 — Canonical frontend staging adapter

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

### [ ] Task 10 — Canonical backend staging adapter

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

### [ ] Task 11 — Staging environment-snapshot E2E phase

Status: `NOT STARTED`

Outcome: The same staging operation dispatches the canonical baseline read-only
E2E suite after all intended components are deployed and links its exact run.

Acceptance criteria:

- [ ] Generic validation inputs replace Release Bus train/manifest coupling.
- [ ] Frontend-only, backend-only, and coordinated deployments are supported.
- [ ] The exact frontend SHA and backend versions by service are verified before
  and after the run.
- [ ] All 12 baseline staging packs are required; partial diagnostic runs cannot
  satisfy the gate.
- [ ] Coordinated operations share one result instead of duplicating suites.
- [ ] Product and infrastructure failures have distinct retry semantics.
- [ ] No separate validation state machine or lock service is introduced; E2E
  is a visible phase of the deployment operation.
- [ ] Snapshot drift fails the result as stale and allows a rerun without
  globally blocking colleagues' deployments.

Evidence: Not yet available.

### [ ] Task 12 — Canonical frontend production adapter

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

### [ ] Task 13 — Canonical backend production adapter

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

### [ ] Task 14 — Production environment-snapshot E2E phase

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
- [ ] Validation state is read directly from the canonical E2E workflow run;
  no duplicate durable validation record is required.

Evidence: Not yet available.

### [ ] Task 15 — Simple operational diagnostics

Status: `NOT STARTED`

Outcome: Operators and agents can understand what happened and jump to the
exact failing GitHub evidence without Deploy Hub becoming an analytics system.

Acceptance criteria:

- [ ] The derived snapshot exposes requester, task, PR, SHA, service,
  environment, workflow run, runtime version, validation run, timestamps, and
  result where those fields exist in authoritative sources.
- [ ] The UI shows elapsed time and simple static guidance (approximately seven
  minutes staging E2E and four minutes production E2E) until measured evidence
  justifies anything more.
- [ ] Slow-run warnings do not automatically cancel valid work.
- [ ] A small failure classification distinguishes policy, deployment, product
  E2E, infrastructure, and unknown failures.
- [ ] Diagnostic links reach the exact GitHub run and evidence artifact.
- [ ] Diagnostics link to the existing communication/release-note outcome when
  available; they do not mirror that pipeline or calculate analytics.

Evidence: Not yet available.

### [ ] Task 16 — Agent operations, cancellation, retry, and recovery

Status: `NOT STARTED`

Outcome: Codex can use one documented Deploy Hub command path with its existing
GitHub authentication, and operators can cancel, retry, or fall back to the
canonical manual workflow.

Acceptance criteria:

- [ ] This repository provides one small documented agent-facing command or
  skill for staging, production, status, cancellation, and retry; it does not
  require the browser or a Deploy Hub credential.
- [ ] Agent operations use the same fixed repositories, workflows, refs,
  inputs, exact-SHA checks, and production-intent rules as the page.
- [ ] A Codex task can recover an operation from its exact run ID/URL and
  continue until terminal success or a real blocker.
- [ ] Waiting and running cancellation map to GitHub workflow cancellation and
  are tested.
- [ ] Retry dispatches the same exact SHA/target and links the new run to the
  prior attempt.
- [ ] Page or agent restart requires no reconstruction job: the next lookup polls
  GitHub workflow and runtime truth.
- [ ] Direct workflow cancellation and partial deployment are represented
  truthfully.
- [ ] Known-good exact redeployment is documented for staging and production.
- [ ] Manual canonical break-glass paths are proven independently.
- [ ] Communication replay and recovery cannot duplicate a CI drop or release
  note and never require redeploying the application.
- [ ] No automatic cross-repository rollback is introduced.
- [ ] No reconciler, missed-event processor, callback receiver, or retry
  scheduler is introduced.

Evidence: Not yet available.

### [ ] Task 17 — Reuse deployment communications and release-note links

Status: `NOT STARTED`

Outcome: Canonical workflows continue to own CI drops and production release
notes; Deploy Hub supplies exact operation context and displays the available
outcome/link without copying that pipeline's state.

Scope:

- Finalize the GitHub authority, Deploy Hub origin, and immutable notification
  evidence contract using the source task and PRs as implementation input.
- Preserve repository-owned contributor derivation, backend CI-alert rendering,
  production eligibility, queue/generator, deduplication, and publication.
- Integrate the smallest available communication link/outcome into operation
  lookup, PR feedback, and the polling UI.
- Preserve explicit no-PR/internal/recovery behavior and backend multi-service
  release grouping.
- Remove Release Bus-specific identity assumptions without discarding the
  secure attribution and release-note behavior they helped establish.

Acceptance criteria:

- [ ] Backend PR #1869 and frontend PR #3504 final disposition is recorded, and
  the implementation uses only behavior verified on the exact deployed/main
  heads rather than assuming open-PR code exists.
- [ ] The GitHub login resolved from the caller token is the authority;
  `Deploy Hub` is an unspoofable operation origin rather than a synthetic
  person or Release Train identity.
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
- [ ] Existing repository/backend tests continue to cover deduplication,
  no-PR, queue/generation failure, already-published, and successful publication
  behavior; Deploy Hub does not reimplement those cases.
- [ ] The available communication link/outcome updates the UI and PR feedback
  without holding a lock or changing deployment and E2E terminal truth.
- [ ] Shadow and fake modes are physically unable to publish real CI or
  release-note drops.
- [ ] Focused integration evidence proves the exact context handoff and
  canonical manual fallback; no second communication ledger, callback bus, or
  release-note state machine is created.

Input evidence:

- `docs/deployment-communications-analysis.md`
- ADR 0004 under `docs/decisions/`
- Source task `019faa0e-272b-7f62-843a-79fffb815a7e`
- [Backend PR #1869](https://github.com/6529-Collections/6529seize-backend/pull/1869)
- [Frontend PR #3504](https://github.com/6529-Collections/6529seize-frontend/pull/3504)

Completion evidence: Not yet available.

### [ ] Task 18 — Credentialless opt-in shadow validation

Status: `NOT STARTED`

Outcome: One credentialless, explicitly opted-in workflow exercises request
planning and UI projection without changing shared refs or environments.

Acceptance criteria:

- [ ] Use `1a-deploy-hub` only if a real branch-trigger integration must be
  tested; otherwise workflow dispatch with exact test SHAs is simpler.
- [ ] At most one credentialless shadow workflow covers frontend and backend
  planning; it does not create parallel deploy implementations.
- [ ] Shadow identity cannot update `1a-staging`/`main`, dispatch real deploys,
  assume staging/production roles, or publish real CI/release-note drops.
- [ ] Any PR feedback write targets only opted-in test PRs.
- [ ] Success, failure, waiting, stale, cancel, retry, UI, and status lookup are
  exercised by reading workflow state, without callbacks.
- [ ] Shadow results are never presented as real deployment evidence.

Evidence: Not yet available.

### [ ] Task 19 — Controlled real-execution canaries

Status: `NOT STARTED`

Outcome: Real mutation is tested during controlled low-risk windows without
making Deploy Hub the only path or blocking colleagues.

Acceptance criteria:

- [ ] Start with canonical workflow dry runs and the least risky shared-staging
  canary during an announced clear window.
- [ ] No new isolated cloud environment is built unless a specific unsafe
  behavior cannot be tested by fakes, shadowing, dry runs, or a controlled
  shared-staging canary.
- [ ] Exact runtime identities and environment-snapshot E2E are proven.
- [ ] Concurrent frontend/unrelated backend scenarios behave as designed.
- [ ] Failure, retry, cancellation, stale, missed-event, and recovery drills pass.
- [ ] Production credentials and production mutation remain absent.

Evidence: Not yet available.

### [ ] Task 20 — Controlled shared-staging pilot and burn-in

Status: `NOT STARTED`

Outcome: Opted-in real work uses Deploy Hub on shared staging without blocking
or endangering colleagues outside the documented short mutation/validation
windows.

Acceptance criteria:

- [ ] Frontend-only, backend-only, and coordinated canaries succeed.
- [ ] Baseline E2E binds exact environment snapshots.
- [ ] Frontend and unrelated backend work are not globally serialized.
- [ ] Waiting, UI, PR feedback, request lookup, retry, cancel, and failure
  behavior match authoritative GitHub/runtime truth.
- [ ] Staging CI drops show exact GitHub authority, Deploy Hub origin,
  requester, and contributor attribution and remain release-note-ineligible.
- [ ] A burn-in window and success/failure acceptance record are complete.
- [ ] Manual canonical staging remains immediately usable.

Evidence: Not yet available.

### [ ] Task 21 — Production pilot and Deploy Hub establishment

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

### [ ] Task 22 — Deferred Release Bus removal and cleanup

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

## Current next task

Task 5 — Canonical workflow concurrency and waiting visibility.
