# Planning Changelog

## 2026-08-04

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
