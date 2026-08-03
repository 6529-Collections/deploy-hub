# Deploy Hub Planning Status

Last updated: 2026-08-03

## Phase

Tasks 0, 1, 3, and 4 are complete. Tasks 2, 5, and 6 are `RETIRED`; their
overbuilt contracts, server, callback/event fakes, and Git-ledger code have
been removed from the active tree. Task 7 is now the small direct-GitHub browser
authentication slice in this repository and is under completion audit.

This repository owns the entire portable static app. It has no API server or
deployment runtime.

## Accepted direction

- Rule 1 is KISS: complexity must answer a demonstrated current need.
- Build Deploy Hub as a new, small control and observability surface; do not
  salvage Release Bus or reproduce its control plane.
- A Codex task owns the feature lifecycle. Deploy Hub owns one exact deployment
  request through terminal reporting.
- Existing frontend/backend workflows own build and deployment behavior.
- Humans use the portable page and Codex uses existing GitHub tooling. Both
  call GitHub directly with their own GitHub authentication.
- Any ordinary static host may serve the page; hosting supplies files only.
- A GitHub workflow run is the operation identity and source of progress truth.
  Runtime/version endpoints provide deployed truth.
- GitHub Actions concurrency owns waiting and conflicting mutation. Deploy Hub
  has no database, Git ledger, custom queue, scheduler, lock service, callback
  service, or reconciler.
- PR feedback uses the canonical workflow check first, then at most one commit
  status. A GitHub App Check Run is allowed only if both prove insufficient.
- The UI polls relevant GitHub state at least every five seconds. There is no
  snapshot server, SSE, WebSocket, cursor, or client event ledger in the MVP.
- Baseline E2E is a linked phase of the deployment operation, not a separate
  state machine. Snapshot drift yields a stale result and rerun instead of a
  cross-repository lock that blocks colleagues.
- Canonical workflows/existing backend retain CI posting and production release
  notes. Deploy Hub links their outcome and does not mirror the pipeline.
- Release Bus is OFF for staging and production and is not expected to return.
  Canonical manual workflows remain the fallback until Deploy Hub is proven.
- Dormant Release Bus code remains during rollout and is removed afterward as
  Task 24 technical debt.

## Current operational baseline

- Release Bus staging and production lanes are OFF.
- Re-enabling Release Bus is not the fallback.
- Existing canonical/manual workflows remain the deployment path.
- Those workflows still contain Release Bus readiness/callback coupling that
  must be generalized by the adapter tasks before final cleanup.
- Current backend deployment is more globally serialized than desired; adapter
  work must narrow concurrency using existing GitHub Actions primitives.

## Repository workflow

- The repository is private and the owner approved direct pushes to `main`
  during this static-app bootstrap.
- Every push requires a fresh `origin/main` divergence check and intentional
  file audit.
- Reconsider protected-main/PR workflow before any task adds GitHub mutation
  capability or another write actor.

## Completed evidence

- Task 1 inventoried the exact current workflows, Release Bus dependencies,
  E2E, and communication pipeline in `docs/current-system-inventory.md`.
- Tasks 2, 5, and 6 are retired experiments preserved only in Git history and
  retired ADRs. Their active code, tests, schemas, and fixtures were removed by
  ADR 0010.
- Task 3 now settles direct browser/agent GitHub authentication in ADR 0011 and
  `docs/security-model.md`; no Deploy Hub credential or backend exists.
- Task 4 now consists only of the repository toolchain, static UI shell, and
  read-only CI. The superseded loopback TypeScript server was removed.
- The requirements, architecture, tracker, migration, testing, E2E, and
  communications documents are stored in this repository.

## Next work

Complete Task 7's audit and exact-head CI. Then proceed to Task 8 without adding
a backend, proxy API, live ledger, state branch, database, scheduler, callback
system, GitHub App, or realtime transport.
