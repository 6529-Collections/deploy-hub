# Deploy Hub Status

Last updated: 2026-08-04

## Current position

Tasks 0–4 are complete. Task 5, canonical workflow concurrency and waiting
visibility, is in progress. Backend PR #1901 now contains the paired minimal
change needed for safe manual backend staging concurrency: service-scoped
GitHub Actions waiting plus a compatible manual-readiness guard. Production,
frontend, and dormant Release Bus safety behavior remains unchanged.

A frontend-only lifecycle revision is now proposed under `FE-REVISIONS/`. It
defines explicit-request staging batching, bounded workflow-driven staging
failure isolation, mixed staging/production targets, and production batching.
It is review material, not accepted architecture or implementation: no task
status changed, and the current no-batching/no-automatic-reconciliation
boundary remains authoritative until the revision is explicitly accepted.

Release Bus is OFF for staging and production and is not expected to return.
Canonical manual workflows remain the deployment path and fallback while
Deploy Hub is built and proven.

## Accepted architecture

- Deploy Hub is a portable static app contained entirely in this repository.
- Humans use the page with their GitHub token; Codex uses its existing GitHub
  authentication through one small agent-facing command or skill.
- GitHub permissions and canonical workflows enforce mutation authorization;
  the static page is not a security boundary.
- GitHub workflow runs, checks, artifacts, and runtime-version evidence are the
  sources of operational truth.
- Existing frontend/backend workflows retain build and deployment ownership.
- GitHub Actions concurrency owns waiting and conflicting mutations.
- The UI polls GitHub at least every five seconds and updates without a browser
  refresh.
- Baseline environment-snapshot E2E is mandatory for staging and production.
- Canonical workflows retain CI posting and production release notes; Deploy
  Hub links their outcomes without duplicating that pipeline.
- Deploy Hub has no backend, proxy API, Lambda, database, ledger, custom queue,
  scheduler, reconciler, callback service, SSE, or WebSocket.

## Completed foundation

- Requirements, architecture, migration, testing, and security are documented.
- The current Release Bus and canonical workflow paths are inventoried.
- The private repository, read-only CI, plain static UI shell, formatting,
  linting, and tests are established.
- Direct browser-to-GitHub identity and operator authentication works with
  local token storage, a forget action, CSP, fixed safe errors, and token-canary
  tests.

## Repository workflow

Direct pushes to `main` remain owner-approved during the private static-app
bootstrap. Fetch and audit `origin/main` before every push. Reconsider protected
main and reviewed PRs before adding deployment mutation capability or another
write actor.

## Next work

Carry backend PR #1901 head `ddb238bc` through review and exact-head CI. The
previous policy-digest CI failure is fixed; the new full build is pending.
Task 5 remains open until the PR reaches backend `main`. Runtime duplicate-wait
proof belongs in the credentialless shadow phase, not on a shared environment.
Review `FE-REVISIONS/` as one frontend decision; if accepted, revise the
requirements, architecture, testing strategy, and affected tracker tasks
before implementation.
