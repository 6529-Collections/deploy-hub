# Deploy Hub Status

Last updated: 2026-08-04

## Current position

The repository has been reset around a frontend-only MVP. The previous broad
frontend/backend plan is archived and no longer controls implementation.

Task 0 is complete. Task 1, the base FE shadow workflow, is in progress. Frontend
PR [#3579](https://github.com/6529-Collections/6529seize-frontend/pull/3579)
merged exact head `abbabaff6f032daf448d6d9eb2433066fa19aabf` into frontend
`main` as `1e712d69a35980dab885057cc4c10ae6a8a7f0e2`.

Frontend PR
[#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
is open at exact head `5f4098c9680052501ed85e8088a991b99388cb1d`.
It completes the two shadow Stop projections and carries the in-review Tasks
3–5 workflow implementation: canonical staging and production dispatch,
bounded reconciliation, exact staging composition, and forward-only removal
with automatic restore on failure. The PR is not merged, and no Deploy Hub
operation was dispatched.

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
- Staging composition is carried in bounded Deploy Hub commit metadata so one
  tracked unmerged PR can be removed without a database. Removal uses another
  forward-only deploy and full E2E; failure restores and revalidates the prior
  snapshot.
- The UI polls GitHub and repairs its view from the next complete read.
- No Deploy Hub backend, database, custom queue, continuously running
  reconciler, callback receiver, or agent polling loop exists.

## Assets

The exact supplied mark is stored as the brand master with UI-icon,
apple-touch, and PNG favicon sizes under `ui/assets/brand/`. The files are
deliberately saved but not connected to the current UI yet.

## Safety boundary

No real deployment or repository mutation capability is present on frontend
`main`. Task 1's merged shadow workflow remains unable to mutate refs or
environments. PR #3586 proposes explicit mutation workflows, but they remain
inactive while the PR is open; this follow-up did not dispatch them.

## Next work

Review and decide PR #3586, then complete the opted-in shadow status proof and
build the Task 2 UI entry points, including Stop and Remove from staging. Any
real staging canary still requires a separate explicit owner instruction.
