# Deploy Hub Status

Last updated: 2026-08-05

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
is open at exact head `71a20ee65082c83ea3eb43aecf3638189a42a36b`.
It completes Task 1, Task 3, and Task 4: canonical staging and production
dispatch, durable GitHub-native request intake, bounded reconciliation,
truthful terminal cohort outcomes, exact staging composition, current
production preflight, frozen-SHA ancestry and rollback protection, and
forward-only removal with automatic restore on failure. It also contains the
lower-level primitives used by Task 5. The PR
remains open, and no Deploy Hub operation was dispatched.

The latest action was a conflict-free sync with current frontend `main`; newly
triggered CI was not polled. Before that sync, the review follow-up verified
each production merge against the exact authorized main parent, published
terminal Deploy Hub status even when staging E2E packs are skipped, and
rejected insecure or redirected credentialed GitHub API requests. All then-open
CodeRabbit threads were resolved, and focused local validation passed.

Task 2 is **DONE**. Tasks 3, 4, and 5 are **DONE — PENDING** frontend PR
[#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586).

- Task 3 has all 16 criteria implemented. One fixed commit-status context holds
  pending requests until the surviving controller claims them; later cohorts
  are terminalized if an earlier cohort stops or fails. Queued work remains
  visible and cancellable under its original Stop identity.
- Task 4 has all 13 criteria implemented. Production requires the installed App
  PR CI check and rechecks each requester, exact head, current `main`,
  mergeability, check runs, and external statuses immediately before that PR's
  merge. The canonical deploy keeps its frozen SHA valid if `main` advances,
  while blocking removed-history candidates and unintended rollbacks.
- Task 5 has all 8 criteria implemented. One dependency-free command uses the
  caller's existing GitHub authentication to submit, read one current status
  snapshot, stop, retry, or remove through the same fixed UI contract. It
  preserves exact SHA/target identity, rejects moved-head retries, prints exact
  GitHub run identity, and exits without becoming an execution dependency.

The completed Task 2 UI freezes and previews exact PR heads, submits the fixed
live workflow contract, refreshes GitHub truth every five seconds, shows
environment and operation evidence, and exposes exact Stop and tracked
staging-removal actions. It remains static and stores no Deploy Hub operation
state outside GitHub. The desktop UI now uses exact one-third/two-thirds panel
alignment, a single-line `6529 Deploy Hub` header, non-wrapping actions, and
neutral near-black surfaces. Initial load uses an explicit session-checking
state, and operators select from a searchable, ordered list of current open
frontend PRs instead of entering numbers manually. Signed-out access is a
compact vertical token form; redundant login copy and the source footer have
been removed. Field focus is deliberately subtle, and machine states such as
`in_progress` and `queued` render as `In progress` and `Waiting to start`. All
22 original completion checks and exact-head repository CI pass for completion
commit
[`efa3ace`](https://github.com/6529-Collections/deploy-hub/commit/efa3acea8310340d0b6d1b680cb4dbf2d29f1854).
The current UI regressions and all 35 repository tests also pass.

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

Task 6 begins with shadow-only validation through the already-merged dormant
shadow workflow. Keep frontend PR #3586 open and do not mutate staging or
production during this phase. Merge #3586 only after shadow evidence passes and
the owner separately authorizes a controlled real canary. Any merge or real
staging operation still requires an explicit owner instruction.
