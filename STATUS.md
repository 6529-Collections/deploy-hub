# Deploy Hub Planning Status

Last updated: 2026-08-03

## Phase

Tasks 5 and 6 complete. The next dependency-ready deliverable is Task 7, the
authenticated agent-facing API; it has not started. The owner must resolve the
open KISS decisions in `docs/kiss-architecture-review.md` before Task 7 expands
the current skeleton.

## Accepted direction

- Rule 1 is KISS: Keep It Simple, Silly. Complexity requires current evidence,
  not hypothetical future need.
- Build Deploy Hub as a new system rather than iterating Release Bus.
- A Codex task owns the end-to-end feature lifecycle.
- Deploy Hub owns one exact deployment operation from acceptance to terminal
  reporting.
- Repositories retain their canonical build and deployment workflows.
- Frontend and backend deployment capacity is independent.
- Use the smallest GitHub surface that provides current PR feedback: existing
  workflow checks or commit statuses first, and a narrow Check Run only if
  those are insufficient.
- A dedicated operational UI is mandatory.
- The first secret-free UI shell is stored on `deploy-hub/main` and served
  through a backend private-repository proxy from one resolved exact commit
  SHA; operational data and commands require GitHub Bearer authentication.
- The operational UI updates deployments, queues, and blockers automatically;
  users never refresh the browser to obtain current state.
- GitHub-native records are the MVP durable evidence; no database or S3 request
  ledger is introduced without demonstrated need.
- Reuse the current deploy UIs' GitHub Bearer-token authentication for humans
  and Codex. The backend resolves `/user`, checks repository/operator policy,
  and treats task IDs as correlation only.
- The browser follows the existing internal-tool token model and the UI starts
  with five-second authenticated snapshot polling. No OAuth server, PKCE,
  wallet role mapping, refresh-token store, GitHub App token broker, WebSocket
  ticket flow, or callback identity system is part of the MVP.
- Deploy Hub preserves canonical workflows' existing AWS authentication and
  prefers observing GitHub workflow/run truth over adding callbacks.
- Deployment health and exact-version proof are always required. Every staging
  and production outcome requires mandatory baseline read-only
  E2E bound to one exact environment snapshot. Coordinated deployments share
  one validation result after all intended components are deployed; deeper
  feature-specific and cross-system validation remains risk-based.
- Canonical workflows and the existing backend retain CI deployment posting,
  exact initiator/contributor attribution, and production release-note
  automation. Deploy Hub supplies immutable request/authority context and
  observes their non-gating outcomes instead of rebuilding that pipeline.
- MVP rollback is an explicit agent-guided or manual exact-version redeployment
  through the canonical repository workflow.
- Release Bus is already OFF for both staging and production and is not
  expected to be re-enabled.
- Release Bus code and infrastructure remain in place during Deploy Hub
  development and burn-in, then are cleaned up as explicitly tracked technical
  debt after Deploy Hub proves itself.

## Current operational baseline

- Release Bus is OFF for staging and production.
- Re-enabling Release Bus is not part of the intended migration or fallback.
- Existing manual/canonical repository workflows are the operational fallback
  while Deploy Hub is developed and tested. They currently still obtain
  readiness from Release Bus even though its lanes are OFF.
- Deploy Hub testing must begin offline and read-only, then use isolated
  execution before any controlled shared-staging canary.
- Frontend shadow validation will use an explicitly opt-in `1a-deploy-hub`
  integration branch with a credentialless workflow that cannot mutate shared
  environments.

## Current repository workflow

- The repository is private and the owner explicitly approved direct pushes to
  `main` during the current credentialless bootstrap. Every push must follow a
  fresh remote-head/divergence check and an intentional file audit.
- Protected-main/task-branch workflow is deferred. It must be reconsidered
  before Task 7 handles live GitHub tokens or any repository/environment
  permission, deployment authority, secret, or additional write actor is
  introduced.

## Current documents

- Requirements v1.0 agreed.
- Target architecture and agent-to-production sequence agreed at v1.0.
- Migration and test strategies updated with mandatory environment-snapshot
  E2E gates.
- Current staging and production E2E workflows, coverage, integration gaps, and
  recent GitHub Actions durations analyzed in `docs/e2e-validation-analysis.md`.
- Task 1 completed in `docs/current-system-inventory.md` against exact frontend
  and backend `main` SHAs plus the authoritative live Release Bus status.
- Both Release Bus lanes are confirmed OFF, but every canonical manual workflow
  still depends on Release Bus manual readiness; this boundary must be
  generalized before Release Bus removal.
- Current backend manual deployments are globally serialized per environment,
  and exact Lambda/API runtime proof is Release Bus-conditioned rather than
  generic. Both are explicit adapter requirements.
- Mandatory environment-snapshot E2E accepted in ADR 0004.
- Source task `019faa0e-272b-7f62-843a-79fffb815a7e`, open backend PR #1869,
  and open frontend PR #3504 analyzed as the foundation for deployment
  communications.
- Deployment communications boundary accepted in ADR 0005 and documented in
  `docs/deployment-communications-analysis.md`.
- Root implementation tracker contains stable Tasks 0–25; Tasks 0–6 are
  complete, Task 7 is next, and Task 25 owns the cross-cutting communications
  integration.
- Architecture-wide KISS review added as a pre-Task-7 decision gate; auth and
  polling defaults are simplified, while ledger, validation, concurrency,
  projections, shadow, runtime placement, and other flagged machinery remain
  explicitly unresolved rather than silently approved.
- Task 2 completed the versioned deployment, validation, cancel, retry, ledger,
  task-event, communication-outcome, and safe-error schemas with normative
  fixtures under `docs/contracts/`.
- ADR 0006's credentialless `state/v1` prototype is complete, but K1–K4 now
  gate live ledger use and duplicate GitHub projections behind comparison with
  workflow-run/status/runtime evidence.
- The Task 2 completion audit compiled all 14 schemas in strict JSON Schema
  2020-12 mode, validated 12 schema-backed objects across nine fixtures, and
  proved six key unsafe cases fail closed.
- Task 3's original wallet/OAuth/App/WebSocket design was superseded before
  implementation by ADR 0009. The current model reuses GitHub Bearer tokens,
  existing operator policy, caller-attributed GitHub execution, polling-first
  UI updates, and canonical workflow-owned AWS authentication. No identity,
  permission, credential, workflow, or environment authority was created.
- Task 4 completed the credentialless skeleton with one Node/TypeScript package,
  zero runtime dependencies, a read-only status API, disabled GitHub and
  deployment boundaries, a plain static UI shell, four unit tests, and a
  read-only CI workflow. Local checks and exact-head GitHub Actions run
  `30818122104` passed.
- Task 5 completed deterministic in-memory frontend, backend, E2E, callback,
  CI-drop, and release-note behavior for success, delay, product and
  infrastructure failure, cancellation, stale, duplicate, and conflict cases.
  The completion audit passed local format, lint, type, build, and all 12 tests
  with zero production dependencies or live capability.
- Task 6 completed the Git ledger semantics behind a minimal repository port:
  stable digests, atomic acceptance, deterministic waiting, non-force
  compare-and-swap retry, append-only events, replayable snapshots, exact-SHA
  and snapshot enforcement, and GitHub-evidence reconciliation. The in-memory
  Git adapter and 10 ledger tests prove the behavior without creating a live
  state branch or transport. Local and exact-head CI passed all 22 repository
  tests on commit `ec725aacf0edf25dc7bc819f9803e536bdcf377a`.
- `1a-deploy-hub` frontend shadow-branch design documented across requirements,
  architecture, migration, and testing.
- Initial architecture and MVP foundation decisions recorded.
- Four Mermaid diagrams saved as standalone source files, including the
  simplified GitHub-token trust boundaries.
- Original handoff documents copied into `references/`.

## Resolved MVP decisions

1. GitHub-native durable records first; no MVP database or S3 request ledger.
2. Canonical manual workflows are the fallback; Release Bus remains OFF.
3. Health, exact-version proof, and baseline environment-snapshot E2E are
   universal; deeper feature-specific validation is risk-based.
4. Reuse existing GitHub Bearer-token authentication and operator policy for
   humans and Codex; do not add a GitHub App unless a later narrow capability
   proves it necessary.
5. Serve the static UI from the exact current `deploy-hub/main` commit through
   the backend private-repository proxy. Require GitHub Bearer auth for
   operational data and commands, and use polling at least every five seconds
   for automatic updates.
6. Keep automatic rollback out of MVP; redeploy a known-good exact version
   explicitly through canonical workflows.
7. Reuse repository-owned CI posting and backend production release-note
   automation. Treat requester, authenticated GitHub authority, Deploy Hub
   origin, and exact contributors separately; surface communication failures
   without making them environment-mutation or deployment/E2E gates.
8. The Task 6 `state/v1` design is a proven credentialless prototype, not an
   approved live dependency. K1–K4 require the smaller workflow-run/status/
   runtime-evidence model to be assessed first.
9. ADR 0009 supersedes the earlier wallet OAuth, browser session, GitHub App
   broker, workflow-callback OIDC, and WebSocket plan. Existing GitHub auth and
   canonical workflow security boundaries are the MVP.

## Remaining security and implementation work

- Task 7 must add the GitHub-token-authenticated agent-facing contract while
  retaining the current credentialless boundary until its focused pre-live
  gate is ready.
- Later rollout tasks add only the permissions and security tests required by
  their actual GitHub operations. OAuth/session/webhook/OIDC/WebSocket/App
  machinery is not pre-approved work.
- The architecture-wide KISS review in `docs/kiss-architecture-review.md`
  flags unresolved complexity that must be decided before Task 7 expands the
  current skeleton, especially the custom Git ledger and duplicate projection/
  callback surfaces, separate validation/lock machinery, and whether the API
  should simply live in the existing backend rather than a new runtime.
- Reinspect backend PR #1869 and frontend PR #3504 when they change or merge;
  at the Task 1 snapshot they remain open and unmerged, so repository `main`
  still has the older communication contract.
- Define how asynchronous release-note outcomes become machine-visible to
  Deploy Hub without introducing a second durable release-note state store.

## Next recommended work

Review the open KISS flags with the repository owner before Task 7. Task 7 must
remain a small GitHub-token-authenticated HTTP API; do not create a GitHub App,
live state branch, OAuth service, WebSocket service, deployment authority, AWS
role, or production credential as an incidental API step.
