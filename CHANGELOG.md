# Planning Changelog

## 2026-08-04

- Started Task 1 with frontend PR
  [#3579](https://github.com/6529-Collections/6529seize-frontend/pull/3579):
  a dormant exact-input shadow workflow with read-only repository/PR access and
  one dedicated shadow-status write. It has no ref, deployment, environment,
  OIDC, stored-secret, or workflow-dispatch authority.
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
