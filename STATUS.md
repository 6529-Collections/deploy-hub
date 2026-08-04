# Deploy Hub Status

Last updated: 2026-08-04

## Current position

The repository has been reset around a frontend-only MVP. The previous broad
frontend/backend plan is archived and no longer controls implementation.

Task 0 is done. Task 1 is **DONE — PENDING** frontend PR
[#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586).
Frontend PR [#3579](https://github.com/6529-Collections/6529seize-frontend/pull/3579)
merged exact head `abbabaff6f032daf448d6d9eb2433066fa19aabf` into frontend
`main` as `1e712d69a35980dab885057cc4c10ae6a8a7f0e2`.

Frontend PR
[#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
is open at exact head `fd85433ce4fe7870a13451a292bf536d8724bb94`.
It completes Task 1 and carries most of the Task 3 and Task 4 workflow
implementation: canonical staging and production dispatch, bounded
reconciliation, exact staging composition, and forward-only removal with
automatic restore on failure. It also contains lower-level primitives needed
by Task 5. The PR remains open, and no Deploy Hub operation was dispatched.

Tasks 2, 3, and 4 are **IN PROGRESS**. Task 5 is **NOT STARTED**.

- Task 2 has one remaining acceptance criterion: browser-module,
  accessibility, formatting, lint, and repository-CI evidence for the final
  implementation.
- Task 3 has 14 of 16 criteria implemented in PR #3586. The two remaining code
  gaps are durable handling of requests arriving behind an active operation
  and terminalizing later cohorts when an earlier cohort stops the manifest.
- Task 4 has 11 of 12 criteria implemented in PR #3586. Production must still
  recheck successful required PR checks immediately before mutating `main`.

The current Task 2 implementation freezes and previews exact PR heads, submits
the fixed live workflow contract, refreshes GitHub truth every five seconds,
shows environment and operation evidence, and exposes exact Stop and tracked
staging-removal actions. It remains static and stores no Deploy Hub operation
state outside GitHub. Local formatting, lint, and all 16 focused tests pass.
The remaining Task 2 criterion does not require merging PR #3586 early.

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
apple-touch, and PNG favicon sizes under `ui/assets/brand/` and is connected to
the current UI.

## Safety boundary

No real deployment or repository mutation capability is present on frontend
`main`. Task 1's merged shadow workflow remains unable to mutate refs or
environments. PR #3586 proposes explicit mutation workflows, but they remain
inactive while the PR is open; this follow-up did not dispatch them.

## Next work

Finish Task 2's remaining acceptance criterion. Then complete the two Task 3
code gaps and the one Task 4 code gap recorded in `TODO.md`. Keep PR #3586 open
until its frontend changes are actually needed. Any real staging operation
still requires a separate explicit owner instruction.
