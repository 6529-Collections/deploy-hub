# Deploy Hub Status

Last updated: 2026-08-11

## Current position

Deploy Hub remains a frontend-only static UI backed by GitHub. It has no
application server, database, or separate queue.

The UI now presents deployment activity in three simple sections:

- **Active Deployment** — work currently running.
- **Queued Batches** — waiting operations grouped by adjacent final target.
- **Recent Operations** — completed, failed, stopped, or cancelled work.

Empty Active Deployment and Queued Batches sections stay hidden. Read-only and
operator views use the same compact activity layout; only operators receive
mutation controls.

Every visible request identifies its exact PR SHA. The accepted behavior for a
moved PR head is also fixed:

- queued request: remove it and report `Cancelled · PR updated`;
- active request: finish or safely recover the frozen SHA, while making clear
  that the newer PR head was not deployed.

This change defines and renders the required view only. It does not add a queue
service or deployment controller.

## Implementation status

- Task 0 — repository baseline: **DONE**
- Task 1 — real FE dry run: **DONE — PENDING**
  [FE PR #3653](https://github.com/6529-Collections/6529seize-frontend/pull/3653)
- Task 2 — live frontend UI: **DONE**
- Task 3 — real frontend staging: **IN PROGRESS**
- Tasks 4–7: **NOT STARTED**

[FE PR #3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
contains the earlier controller prototype. It is not active and must be
reconciled with the final simplified canonical FE deployment workflows before
Tasks 3–5 can proceed.

## Deferred until the FE workflow work finishes

- Enforce queued-head cancellation in the real controller.
- Publish active, queued, batch, exact-SHA, and terminal status to PRs.
- Wire real staging, production, retry, Stop, and recovery behavior.
- Test the full flow in shadow mode before any live adoption.

The canonical manual frontend workflows remain the fallback while this work is
paused.

## UI

The current static UI is published at
<https://6529-collections.github.io/deploy-hub/>.
