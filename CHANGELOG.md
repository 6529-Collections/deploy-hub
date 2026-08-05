# Planning Changelog

## 2026-08-05

- Fixed missing Production history by reading the latest staging and production
  executions from their exact workflow endpoints instead of relying only on the
  repository's newest 100 Actions runs. Aligned `View workflow` to each card's
  right edge while retaining the latest-run link on the left.
- Removed horizontal scrolling from the PR picker. Titles now wrap to at most
  two lines, while branch and author metadata wrap safely when needed.
- Disabled `Review selected PRs` while the selection is empty and made the
  selection requirement visible before submission instead of only after an
  invalid click.
- Added permanent `View workflow` links for the canonical frontend staging and
  production deployment workflows alongside each environment's latest run.
- Replaced the false initial `No recent run` environment placeholders with
  loading indicators. That empty state now appears only after a successful
  GitHub snapshot contains no matching environment run.
- Normalized GitHub states without renaming them: underscores become spaces and
  every word is capitalized (`queued` → `Queued`, `in_progress` →
  `In Progress`).
- Replaced the doubled, oversized field-focus glow with a subtle one-pixel
  highlight.
- Reduced signed-out access to one compact vertical GitHub form with a
  full-width token field and button. Removed the redundant access explanation,
  oversized login treatment, source placeholder, and footer.
- Replaced the stored-session login flash with a dedicated session-checking
  state. Replaced manual PR-number entry with a bounded, ordered multi-select
  of current open frontend PRs searchable by number, branch, title, or author;
  exact heads are still re-fetched and frozen at review time. All 35 repository
  tests pass.
- Refined the static UI without changing operation behavior: replaced the
  mismatched summary/workspace grid formulas with one shared three-column grid,
  prevented action labels from wrapping, reduced the header to one
  `6529 Deploy Hub` line, and replaced the blue-tinted page gradient and
  surfaces with a neutral near-black palette. All 33 repository tests pass.
- Synchronized frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  with current frontend `main` at exact head
  `71a20ee65082c83ea3eb43aecf3638189a42a36b`. The merge was conflict-free;
  newly triggered CI was not polled. Corrected the Task 6 handoff: shadow-only
  validation comes first, with #3586 unmerged and no staging or production
  mutation until shadow evidence passes and a real canary is separately
  authorized.
- Completed Task 5 as **DONE — PENDING** frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586).
  Added one dependency-free agent command for submit, one-shot status, exact
  Stop, same-SHA retry, and tracked staging removal using existing GitHub
  authentication and the UI's fixed operation contract. All 32 repository
  tests, formatting, and lint pass; no operation or deployment was dispatched.
- Synchronized frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  with current frontend `main` at exact head
  `11c84cc6be0b33312d4d3ea26e986bbce500ec14`. The merge was conflict-free;
  newly triggered CI was not polled.
- Followed up frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  again at exact head `be52c0ea98433f8001a494de2cd05fb34f510611`.
  Synced current frontend `main`, bound production continuation to exact merge
  parents, made skipped staging E2E paths publish terminal Deploy Hub status,
  and rejected insecure or redirected credentialed GitHub API requests. All
  review threads are resolved; newly triggered CI was not polled.
- Followed up frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  at exact head `11ca7e8faada64bd224597d7bb5302801814fdfd`. Synced current
  frontend `main`, fixed the failing Knip export and Sonar predicate finding,
  bound canonical deploys to their exact controller operation and commit, and
  adopted `main`'s automatic E2E dispatch without duplicate runs. All review
  threads, including outdated CodeRabbit threads, are resolved. No workflow
  was dispatched and newly triggered CI was not polled.

## 2026-08-04

- Followed up frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  at exact head `eb1cb9fa22f38bace28028cd8a808bd1c6836958`. Fixed its
  task-owned Jest typecheck failure and addressed current orchestration review
  findings covering request retries/timeouts, nested refs, mergeability
  polling, workflow provenance, status ordering, final deadline polling,
  reconciliation races, base-ref propagation, and original-error preservation.
  The 122 focused tests, Jest ratchet, and changed-code quality checks pass
  locally; no workflow was dispatched and new CI was not polled.
- Completed the Task 3 and Task 4 implementation in frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  at exact head `93150e4fe9254c2121196e0234dd5746baa9e544` and marked both
  tasks `DONE — PENDING` that PR.
- Followed up PR #3586 by requiring the installed App PR CI check, revalidating
  each production PR against the `main` produced by the preceding merge, and
  fixing both open Sonar findings. Replaced the canonical production workflow's
  exact-latest-`main` equality gate with frozen-SHA ancestry and current
  production rollback protection, so ordinary `main` advancement no longer
  invalidates an already authorized build.
- Added a KISS durable-intake path: the static UI registers exact pending
  requests in one fixed GitHub commit-status context, and the surviving
  frontend controller discovers, orders, and claims them without a database,
  custom queue, server, or agent polling. Queued requests remain visible and
  preserve their exact Stop identity when a later controller claims them.
- Ensured every later cohort reaches terminal status after an earlier stop or
  failure, and made production recheck retained requester authority, exact PR
  heads, current `main`, clean mergeability, check runs, and external statuses
  immediately before mutation. Focused FE tests and changed-file quality checks
  pass; no workflow was dispatched.
- Completed Task 2, the live static frontend UI, at commit
  [`efa3ace`](https://github.com/6529-Collections/deploy-hub/commit/efa3acea8310340d0b6d1b680cb4dbf2d29f1854).
  Added explicit keyboard focus transitions, busy-state semantics, clearer
  staging/production confirmation, improved muted-text contrast, and
  dependency-free browser-entry and accessibility coverage. All 22 checks and
  exact-head repository CI pass.
- Re-audited frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  at exact head `fd85433ce4fe7870a13451a292bf536d8724bb94`
  against every tracker criterion. Task 1 is `DONE — PENDING` that linked PR;
  Task 2 is `DONE`; Tasks 3 and 4 are `IN PROGRESS`; Task 5 is `NOT STARTED`.
- Marked the 14 Task 3 staging criteria and 11 Task 4 production criteria that
  are actually implemented. Left only three concrete code gaps unchecked:
  durable intake behind an active operation, terminal outcomes for later
  cohorts after an earlier stop, and required-check revalidation immediately
  before production mutation.
- Removed the ambiguous `PENDING INTEGRATION` status and generic extra suffix
  from the tracker. Frontend PR #3586 remains open, and no workflow was
  dispatched.
- Started Task 2, the live static frontend UI.
- Implemented the Task 2 static operation dashboard: exact-head request review,
  fixed GitHub workflow dispatch, five-second full-snapshot refresh,
  environment and operation evidence, exact Stop, tracked staging removal, and
  accessible Deploy Hub branding. The browser holds no operation state beyond
  the existing GitHub token; GitHub remains the source of truth. All 16 local
  authentication and operation tests plus formatting and lint pass.


- Merged the dormant Task 1 frontend shadow workflow through PR #3579 at exact
  head `abbabaff6f032daf448d6d9eb2433066fa19aabf`; frontend `main` merge commit
  is `1e712d69a35980dab885057cc4c10ae6a8a7f0e2`. No workflow was dispatched.
- Made Stop an explicit frontend requirement across the shadow, UI, staging,
  production, agent, and canary tasks: cancel immediately before mutation and
  settle to exact safe truth after mutation begins.
- Started Task 1 with frontend PR
  [#3579](https://github.com/6529-Collections/6529seize-frontend/pull/3579):
  a dormant exact-input shadow workflow with read-only repository/PR access and
  one dedicated shadow-status write. It has no ref, deployment, environment,
  OIDC, stored-secret, or workflow-dispatch authority.
- Hardened the Task 1 shadow failure path so pre-execution failures retain a
  visible Action summary and interrupted status projection makes a best-effort
  transition from pending to terminal error.
- Addressed the remaining frontend review findings by reading the repository's
  default branch instead of assuming `main`, safely rejecting malformed
  request timestamps, and syncing PR #3579 with current frontend `main`.
- Renamed Task 1 to `Base FE shadow workflow` and clarified that FE involvement
  begins with a dormant, permission-limited shadow workflow; real staging
  activation remains a separate Task 3 change.
- Reset the active repository around a frontend-only MVP with eight top-level
  tasks, promoted the accepted lifecycle diagrams under `docs/frontend/`, and
  archived the original cross-repository plan without deleting its evidence.
- Preserved the exact supplied Deploy Hub mark and saved deterministic UI,
  apple-touch, and PNG favicon sizes under `ui/assets/brand/` for later UI
  integration. No generated/redrawn icon is used.
- Added the review-only `FE-REVISIONS/` diagram set for the complete frontend
  lifecycle: PR-visible target/status, cumulative staging batches, bounded
  workflow-driven isolation of a failed batch, mixed staging/production
  targets, and production batching. The proposal is deliberately not accepted
  architecture yet and changes no task status.
- Extended backend PR #1901 with the matching manual-readiness change so
  different backend staging services can run concurrently while the same
  service queues in GitHub Actions. Production, frontend, and dormant Release
  Bus safety behavior remains unchanged. Task 5 stays open pending exact-head
  CI and merge.
- Started Task 5. Current frontend workflow groups already separate frontend,
  backend, staging, production, and E2E work; backend PR #1901 contains the one
  required change to scope manual staging by service while preserving the
  existing production, Release Bus, and final service safety mutexes.
- Confirmed that GitHub exposes queued/in-progress run status but not a
  dependable concurrency group or queue cause. Deploy Hub will show the honest
  generic `Queued in GitHub Actions` state and link the run, without adding a
  custom queue.
- Kept runtime duplicate-wait validation in the credentialless shadow phase so
  Task 5 does not touch shared staging or production.
- Simplified the implementation tracker to contain only the current Deploy Hub
  plan, with continuous Tasks 0–22 and no discarded-work placeholders.
- Reduced the decision folder to five current architecture decisions and
  synchronized status, requirements references, inventory, testing, E2E, and
  communications documentation.
- Confirmed the active repository contains only the portable static app,
  focused authentication tests, documentation, and its small development
  toolchain.
- Made two required boundaries explicit: GitHub/canonical workflows enforce
  mutation authorization even when the page is bypassed, and Codex receives one
  small agent-facing command/skill using its existing GitHub authentication.

## 2026-08-03

- Completed direct browser-to-GitHub identity and operator authentication with
  local token storage, a visible forget action, strict CSP, fixed safe errors,
  and token-canary tests. Exact-head CI run `30827998834` passed.
- Established the private repository, read-only CI, plain static UI foundation,
  formatting, linting, and tests.
- Completed the authentication, permissions, and threat model.
- Completed the current-system inventory covering Release Bus dormancy, all
  four canonical deployment paths, both E2E workflows, deployment
  communications, and the per-file migration change map.
- Accepted mandatory environment-snapshot E2E for every requested staging and
  production outcome: all 12 staging packs and all 11 production-safe packs.
- Accepted reuse of repository-owned CI notifications and production release
  notes with exact authority, requester, contributor, and release scope.
- Recorded the portable static architecture: humans and Codex use their
  existing GitHub authentication directly; GitHub workflows and runtime proof
  remain authoritative; no Deploy Hub backend or duplicate control plane is
  introduced.
- Recorded the shadow-to-canary-to-pilot migration with canonical manual
  workflows available throughout rollout and Release Bus cleanup deferred until
  Deploy Hub is established.

## 2026-07-31

- Created the Deploy Hub repository and durable planning workspace.
- Added the initial requirements, architecture, migration, testing, diagrams,
  and handoff references.
- Recorded agent-owned feature lifecycles and exact Deploy Hub deployment
  operations instead of Release Bus release trains.
