# Planning Changelog

## 2026-08-04

- Started Task 5. Current frontend workflow groups already separate frontend,
  backend, staging, production, and E2E work; backend PR #1901 contains the one
  required change from an environment-wide manual mutex to an
  environment/service-scoped mutex.
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
