# Deploy Hub Planning Status

Last updated: 2026-08-03

## Phase

Tasks 0–6 are complete. Task 7, the small authenticated API in the existing
6529 backend, is next and has not started.

Tasks 4–6 built credentialless prototypes. Their tooling and static UI shell
remain useful, but their standalone server, callback/event model, and Git
ledger are not the live architecture. No `state/v1` branch or Git adapter will
be created, and Task 7 does not depend on those prototypes.

## Accepted direction

- Rule 1 is KISS: complexity must answer a demonstrated current need.
- Build Deploy Hub as a new, small control and observability surface; do not
  salvage Release Bus or reproduce its control plane.
- A Codex task owns the feature lifecycle. Deploy Hub owns one exact deployment
  request through terminal reporting.
- Existing frontend/backend workflows own build and deployment behavior.
- The existing 6529 backend owns the small authenticated API and GitHub-backed
  static UI proxy. There is no second Deploy Hub server or Lambda.
- Humans and Codex use the current deploy UIs' GitHub Bearer-token/operator
  model.
- A GitHub workflow run is the operation identity and source of progress truth.
  Runtime/version endpoints provide deployed truth.
- GitHub Actions concurrency owns waiting and conflicting mutation. Deploy Hub
  has no database, Git ledger, custom queue, scheduler, lock service, callback
  service, or reconciler.
- PR feedback uses the canonical workflow check first, then at most one commit
  status. A GitHub App Check Run is allowed only if both prove insufficient.
- The UI polls one complete authenticated snapshot at least every five seconds.
  There is no SSE, WebSocket, cursor, or client event ledger in the MVP.
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
  during this credentialless bootstrap.
- Every push requires a fresh `origin/main` divergence check and intentional
  file audit.
- Reconsider protected-main/PR workflow before Task 7 introduces live GitHub
  token handling, permissions, deployment authority, or another write actor.

## Completed evidence

- Task 1 inventoried the exact current workflows, Release Bus dependencies,
  E2E, and communication pipeline in `docs/current-system-inventory.md`.
- Tasks 2 and 6 produced strict contract and Git-ledger prototype evidence.
  Their event-ledger/callback/projection design is now explicitly retired from
  the live architecture.
- Task 3 settled GitHub Bearer-token authentication in ADR 0009 and
  `docs/security-model.md`; no credential or authority was created.
- Task 4 created one credentialless Node/TypeScript package with zero runtime
  dependencies, a static UI shell, and read-only CI. Its loopback status server
  is not the production API foundation.
- Task 5 created deterministic fakes for deploy, E2E, and communications. Its
  callbacks/events are test history, not live contracts.
- Task 6's 22-test exact-head CI passed, but the code remains a historical
  prototype only.
- The requirements, architecture, tracker, migration, testing, E2E, and
  communications documents are stored in this repository.

## Next work

Implement Task 7 as a small endpoint set in the existing backend. Before any
live credential or permission is added, perform the documented pre-live gate
and reconsider direct-to-main development. Do not create a new runtime, live
ledger, state branch, database, scheduler, callback system, GitHub App, or
realtime transport as part of Task 7.
