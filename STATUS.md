# Deploy Hub Status

Last updated: 2026-08-04

## Current position

The repository has been reset around a frontend-only MVP. The previous broad
frontend/backend plan is archived and no longer controls implementation.

Task 0 is complete. Task 1, the base FE shadow workflow, is in progress through
frontend PR
[#3579](https://github.com/6529-Collections/6529seize-frontend/pull/3579) at
synced head `abbabaff6f032daf448d6d9eb2433066fa19aabf`.

## Retained foundation

- Private `deploy-hub` repository with read-only CI and direct-to-`main`
  bootstrap workflow.
- Plain static UI shell with no server runtime.
- Direct browser-to-GitHub authentication, operator membership verification,
  local token storage, forget action, CSP, safe fixed errors, and token-canary
  tests.
- Existing canonical frontend staging, production, E2E, CI-notification, and
  production release-note paths remain the intended execution owners.
- Canonical manual workflows remain the fallback while Deploy Hub is built and
  proven.

## Accepted FE-only direction

- Every request freezes an exact frontend PR head and explicit final target.
- Adjacent same-target requests may share a staging cohort. Different final
  targets never enter the same snapshot.
- A production continuation can run independently after its staging cohort
  passes while the staging lane processes the next cohort.
- Infrastructure failures retry only the same exact snapshot within a bounded
  budget.
- Product failures in a multi-PR staging cohort use bounded ordered replay and
  non-force recovery commits.
- Production merges and failures always report exact `main` and runtime truth;
  production never auto-isolates or rolls back PRs.
- PR commit status and GitHub workflow evidence provide durable request and
  progress state.
- The UI polls GitHub and repairs its view from the next complete read.
- No Deploy Hub backend, database, custom queue, continuously running
  reconciler, callback receiver, or agent polling loop exists.

## Assets

The exact supplied mark is stored as the brand master with UI-icon,
apple-touch, and PNG favicon sizes under `ui/assets/brand/`. The files are
deliberately saved but not connected to the current UI yet.

## Safety boundary

No real deployment or repository mutation capability has been added. The Task
1 PR adds a dormant, explicitly dispatched workflow to the frontend repository.
It uses only the repository's automatic `GITHUB_TOKEN`, with read access plus
permission to write its dedicated shadow commit status. It is physically unable
to mutate `1a-staging`, `main`, staging, production, CI notifications, or
release notes.

## Next work

Finish latest-head review of frontend PR #3579. After explicit owner approval
to merge it, run the workflow against an opted-in test PR and verify the live
shadow status and authoritative Action link. Real staging activation remains
deferred to Task 3.
