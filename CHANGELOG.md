# Planning Changelog

## 2026-08-03

- Corrected the owner-reconfirmed repository boundary: Deploy Hub is entirely a
  portable static app in this repository, not an API in
  `6529seize-backend`. Closed mistaken backend PR #1900 unmerged and deleted
  its remote branch. ADR 0011 now supersedes the backend proxy/API assumption.
  Task 7 implements direct browser-to-GitHub `/user` and operator-membership
  authentication with local token storage, a forget action, CSP, fixed safe
  errors, and token-canary tests; Codex continues using its existing GitHub
  authentication directly.
- Completed Task 7 at commit
  `c2bbb7a5458ef6c556b7f70447dc75fe2d03de06`; exact-head CI run
  `30827998834` passed formatting, lint, and all eight direct-GitHub auth tests.
  GitHub's response confirmed cross-origin browser access, while backend PR
  #1900 remains closed/unmerged and its remote branch is absent. Task 8 is next.
- Applied the owner-requested KISS cleanup instead of retaining rejected
  prototypes: marked Tasks 2, 5, and 6 `RETIRED`; removed the loopback server,
  TypeScript runtime/domain/adapters, callback/event fakes, 1,146-line Git
  ledger, strict ledger/state contracts, fixtures, and related tests; and
  reduced this repository to documentation, plain static UI, and its small
  format/lint toolchain. ADR 0010 records the boundary. Task 4 remains `DONE`
  only as the repository/static-UI foundation, and Task 7 now states plainly
  that its API implementation belongs in `6529seize-backend`.
- Corrected the KISS follow-up after owner clarification: removed the separate
  `docs/kiss-architecture-review.md` layer and applied the decisions directly
  to requirements, architecture, migration, testing, status, and Tasks 7–25.
  The live MVP now uses the existing backend, GitHub workflow/run/runtime
  truth, canonical Actions concurrency, snapshot polling, and communication
  links. It explicitly excludes the Task 6 live Git ledger, a database, custom
  queue/locks/scheduler/reconciler, callbacks, second runtime, separate
  validation state machine, mandatory isolated cloud environment, and mirrored
  release-note/metrics systems. Tasks 4–6 are retained as completed
  credentialless prototypes/reusable test evidence, but their standalone
  server, callback/event model, and ledger are removed from future-task
  dependencies. Task 7 remains `NOT STARTED`.
- Corrected the MVP authentication design after owner review. ADR 0009 now
  reuses the existing deploy UI's GitHub Bearer-token, GitHub `/user`, and
  operator-policy path for both humans and Codex; ADR 0007 is superseded.
- Removed wallet OAuth, PKCE, the new authorization server, refresh-token
  storage, wallet role mapping, GitHub App token brokering, workflow-callback
  OIDC, and WebSocket-ticket authentication from current MVP requirements,
  architecture, migration, testing, contracts, diagrams, and status.
- Simplified the no-refresh UI default to one authenticated snapshot poll at
  least every five seconds with conditional responses. WebSocket/SSE transport
  now requires measured evidence.
- Simplified authority contracts so the GitHub login resolved from the caller
  token is authority and executor; `Deploy Hub` is operation origin, not a
  synthetic person. Removed the speculative GitHub App executor object from v1
  schemas and fixtures.
- Added (and subsequently removed in favor of direct specification changes)
  `docs/kiss-architecture-review.md`, retaining concrete requirements but
  flagging the custom Git event ledger, separate validation state machine,
  custom locks/queues, duplicate projections/callbacks, early GitHub App,
  shadow branch, static proxy growth, release-note mirroring, and isolated cloud
  infrastructure, a possible duplicate backend runtime, and premature metrics/
  ETA machinery for explicit simplification decisions.
- Placed a live-use KISS gate on the completed credentialless Task 6 prototype:
  no `state/v1` branch or Git adapter is approved until workflow-run/status/
  runtime evidence and canonical GitHub concurrency are assessed first.
- Left Task 7 `NOT STARTED`; this session changed documentation and pre-live
  decisions only and introduced no credential or deployment capability.
- Started Tasks 5 and 6 together under the credentialless direct-to-`main`
  workflow. The implementation is limited to deterministic fakes and a Git
  ledger repository port backed only by an in-memory compare-and-swap test
  repository; no live state branch, GitHub write, credential, workflow, or AWS
  capability is being introduced.
- Completed Task 5 after its acceptance audit: deterministic frontend,
  backend, E2E, callback, CI-drop, and release-note fakes cover every required
  success, delay, failure, cancellation, stale, duplicate, and conflict case.
  Local format, lint, type, build, and all 12 tests passed with zero production
  dependencies and no live network or mutation path.
- Implemented and completed Task 6 behind one Git repository port and an
  in-memory non-force compare-and-swap adapter. Immutable deployment and
  validation acceptance, stable digest replay, deterministic waiting,
  append-only event history, exact snapshot replay, moved-identity rejection,
  interruption reconciliation, retention, tree growth, and tamper failure are
  covered without a live GitHub write path.
- Audited Task 6 at commit `ec725aacf0edf25dc7bc819f9803e536bdcf377a`:
  local and exact-head GitHub Actions run `30819637476` passed formatting,
  lint, type checking, build, and all 22 tests with no production dependencies,
  state branch, App, credential, workflow, AWS access, or external mutation.
- Updated the tracker rule to match the already accepted direct-to-`main`
  credentialless bootstrap rather than the obsolete specification-only phrase.
- Started Task 4 under the owner-approved direct-to-`main` workflow for the
  private credentialless bootstrap. Recorded KISS as Rule 1 and deferred
  protected-main workflow to the pre-credential/live-authority gate.
- Added the single-package Node/TypeScript skeleton with zero runtime
  dependencies, read-only status API, offline-only configuration, disabled
  GitHub/deployment boundaries, plain static UI shell, four unit tests, and a
  credentialless read-only CI workflow.
- Completed Task 4 after its acceptance audit and exact-head GitHub Actions run
  `30818122104` passed. Confirmed there are no production dependencies, live
  permissions, credentials, external API clients, databases, caches, workflow
  dispatches, or environment-mutation paths. Task 5 is next.
- Completed Task 3 after its acceptance audit: every requested GitHub
  capability maps to a feature and rollout phase, read-only shadow is enforced
  by absent credential capabilities, production authority is exact and
  request-bound, secret-bearing surfaces are forbidden, and 26 abuse cases
  were reviewed before any credential existed.
- Accepted ADR 0007: use wallet-backed OAuth 2.1/PKCE for Codex MCP calls,
  short-lived browser sessions with CSRF, a broker-held GitHub App with
  per-operation narrowed tokens, GitHub OIDC for workflow callbacks and AWS,
  and the existing authenticated WebSocket stack with snapshot/polling
  recovery.
- Added the normative authentication/permission/threat model and a saved trust-
  boundary diagram; synchronized requirements, architecture, migration, and
  testing plans and removed the earlier SSE assumption.
- Kept the repository specification-only: no OAuth client, GitHub App,
  credential, state branch, workflow, repository permission, environment, or
  AWS authority was created. Task 4 is now next.
- Started Task 3 authentication, permissions, secured live-transport, and
  threat-model definition without creating credentials or live authority.
- Completed Task 2 after an acceptance audit of every criterion; Tasks 0–2 are
  now done and Task 3 is next.
- Accepted ADR 0006: one protected non-default `state/v1` Git branch is the
  authoritative request/event ledger; GitHub Deployments and Check Runs are
  exact-SHA operational projections.
- Added strict versioned schemas for deployment and validation requests,
  statuses, cancellation, retry, ledger metadata/events, Codex task delivery,
  communication outcomes, and safe API errors.
- Added nine normative fixtures covering success, validation, duplicate,
  stale, cancellation, failed E2E, communication identity, task-event delivery,
  and safe idempotency conflict behavior.
- Closed an audit-found gap by defining the authoritative ledger-event shape
  separately from its post-commit task-delivery envelope.
- Compiled all 14 schemas in strict JSON Schema 2020-12 mode, validated 12
  schema-backed fixture objects, and verified six unsafe cases are rejected.
- Made no runtime, workflow, state-branch, credential, GitHub App, or
  environment change while completing Tasks 1 and 2.
- Started Task 2 contract definition after Task 1 passed its acceptance audit.
- Completed Task 1 with an exact current-system inventory covering live
  Release Bus OFF state, all four canonical deploy paths, both E2E workflows,
  deployment communications, backend hosting/auth/realtime capabilities, and
  the per-file migration change map.
- Confirmed the critical migration ordering constraint: Release Bus lanes are
  OFF, but frontend and backend canonical manual workflows still require its
  manual-readiness API; cleanup cannot precede a proven generic replacement.
- Confirmed backend manual deploys are globally serialized per environment and
  that strong backend exact-runtime proof is currently Release Bus-conditioned.
- Re-inspected backend PR #1869 and frontend PR #3504 at their exact current
  heads; both remain open and unmerged with no GitHub Deployment records for
  those SHAs, so their stronger attribution/outcome behavior is not on `main`.
- Inspected source task `019faa0e-272b-7f62-843a-79fffb815a7e` plus open backend
  PR #1869 and frontend PR #3504, capturing their CI-post attribution and
  production release-note contracts as unmerged implementation evidence.
- Accepted ADR 0005: Deploy Hub reuses repository-owned notification and
  backend release-note automation, supplies immutable authenticated operation
  context, and observes communication outcomes without duplicating the
  generator or making publication a deployment gate.
- Added deployment-communications analysis covering authority/requester/
  contributor separation, exact evidence, bounded attribution, asynchronous
  outcomes, deduplication, same-SHA and unsafe-range behavior, multi-service
  grouping, and recovery.
- Added stable Task 25 for deployment communications, attribution, and
  release-note integration; updated Tasks 0–3, 5, 9, 11, and 18–24 with the
  cross-cutting acceptance criteria and retained Task 1 as the next task.
- Updated the saved architecture diagrams, migration plan, and testing strategy
  to show the existing communications pipeline beside—not inside—the Deploy
  Hub deployment and validation success path.
- Finalized the v1 requirements and target architecture, including the exact
  deployment-versus-validation boundary and terminal failure semantics.
- Accepted mandatory full baseline E2E for every staging and production
  outcome in ADR 0004: 12 current staging packs and 11 current
  production-safe packs bound to an unchanged exact environment snapshot.
- Updated the agent-to-production and target-architecture diagrams so neither
  environment reports success before its snapshot-bound E2E result.
- Expanded migration and testing plans for frontend-only, backend-only, and
  coordinated validation, snapshot drift, product failure, infrastructure
  retry, and environment-scoped locking.
- Added the root `TODO.md` tracker with stable Tasks 0–24, acceptance criteria,
  durable evidence rules, Task 0 completed, and Task 1 designated as next.
- Allowed direct documentation pushes to `main` only during the current private,
  specification-only phase; protected-main and ready-PR workflow becomes a
  prerequisite before executable code, Actions, credentials, or deployment
  authority.
- Analyzed the existing staging and production Playwright workflows, pack
  coverage, triggers, Release Bus coupling, failure behavior, and recent GitHub
  Actions timing history.
- Proposed mandatory baseline read-only E2E for every staging and production
  outcome, bound to an exact environment snapshot rather than a release train.
- Recorded initial observed E2E estimates of roughly seven minutes for staging
  and four minutes for production, with rolling history recommended for UI
  ETAs.
- Agreed the v1 requirements and resolved the six initial MVP decisions.
- Selected GitHub-native durable evidence, canonical manual workflow fallback,
  risk-based staging validation, a least-privilege organization GitHub App, and
  explicit exact-version redeployment instead of automatic MVP rollback.
- Selected a GitHub-backed static UI owned by `deploy-hub/main` and exposed
  through an authenticated exact-SHA backend proxy.
- Made no-refresh operational updates a hard requirement, using a live event
  stream with automatic reconnect, snapshot resynchronization, and bounded
  polling fallback.
- Added ADRs for the MVP control-plane foundations and live operational UI.
- Bootstrapped the private Deploy Hub specification repository with a clean,
  documentation-only project structure and no operational deployment
  capability.
- Recorded that Release Bus is already OFF for staging and production and is
  not expected to be re-enabled.
- Changed the migration fallback from Release Bus to the existing
  manual/canonical repository workflows.
- Added the requirement that Deploy Hub begin with permission-isolated,
  read-only shadow testing before isolated execution or shared-staging use.
- Added the `1a-deploy-hub` frontend shadow integration branch and
  credentialless workflow design, including explicit limits on what shadow
  validation can prove.

## 2026-07-31

- Created the durable Deploy Hub planning workspace.
- Added initial requirements, architecture, migration, testing, and agent
  handoff documents.
- Saved architecture, agent lifecycle, and migration Mermaid diagrams.
- Copied the original Deploy Hub and Release Bus handoff documents into stable
  local references.
- Recorded the decision to use agent-owned release lifecycles and atomic Deploy
  Hub deployment operations.
