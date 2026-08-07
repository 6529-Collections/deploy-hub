# Deploy Hub Status

Last updated: 2026-08-07

## Current position

The repository has been reset around a frontend-only MVP. The previous broad
frontend/backend plan is archived and no longer controls implementation.

Task 0 is done. Task 1 is **DONE — PENDING** frontend PR
[#3653](https://github.com/6529-Collections/6529seize-frontend/pull/3653).
Frontend PR [#3579](https://github.com/6529-Collections/6529seize-frontend/pull/3579)
merged exact head `abbabaff6f032daf448d6d9eb2433066fa19aabf` into frontend
`main` as `1e712d69a35980dab885057cc4c10ae6a8a7f0e2`; its dormant
deterministic simulator has no mutation authority.

Frontend PR
[#3653](https://github.com/6529-Collections/6529seize-frontend/pull/3653)
is open at exact head `1a34765b1f23d49481801b7ca4829dadfa205352`.
It replaces that simulator with the real manual-only dry run. The workflow
checks exact heads, operator authority, production readiness, current-main
composition, retained tracked staging PRs, and local conflicts. It can write
only clearly labelled dry-run commit statuses; it cannot deploy, dispatch
another workflow, or mutate a ref or environment. No dry run was dispatched.

Frontend PR
[#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
is open at exact head `2b868c912a49b588212d0d80df7973c1fa9a216c`.
It completes Task 3 and Task 4: canonical staging and production
dispatch, durable GitHub-native request intake, bounded reconciliation,
truthful terminal cohort outcomes, exact staging composition, current
production preflight, frozen-SHA ancestry and rollback protection, and
forward-only removal with automatic restore on failure. Each staging candidate
is rebuilt from frozen current `main`, retained tracked exact staged PRs, and
the new cohort; an unsafe untracked baseline fails before mutation. It also
contains the lower-level primitives used by Task 5. The PR remains open, and
no Deploy Hub operation was dispatched.

The latest frontend follow-up merged current `main`, preserved the upstream
isolated production-E2E evidence path, required the installed App check to
complete successfully, honoured bounded `Retry-After`, resolved the remaining
CodeRabbit thread, and passed 85 focused tests plus the changed-file check.
Newly triggered CI was not polled.

Task 2 is **DONE**. Tasks 3, 4, and 5 are **DONE — PENDING** frontend PR
[#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586).

- Task 3 has all criteria implemented. One fixed commit-status context holds
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

The completed Task 2 UI now opens as a public read-only dashboard. Signed-out
users see current environment and recent workflow activity through three public
REST reads every five minutes, with a full-width Operations panel and no
deployment, queue, Stop, or removal controls. Login opens a modal; any valid
GitHub identity receives authenticated reads, while only a verified operator
receives the exact queued-PR projection, deployment form, Stop, and tracked
staging-removal controls. A failed first read now replaces loaders with an
explicit rate-limit or availability error; stale-snapshot messaging is used
only after a complete snapshot has actually rendered. The UI freezes and
previews exact PR heads and submits the fixed live workflow contract only in
that authenticated mode. It remains static and stores no Deploy Hub operation
state outside GitHub. The operator UI uses exact one-third/two-thirds panel
alignment, a single-line `6529 Deploy Hub` header, non-wrapping actions, and
neutral near-black surfaces. A stored operator session is checked without
hiding the public dashboard, and operators select from a searchable, ordered
list of current open frontend PRs instead of entering numbers manually. Field
focus is deliberately subtle, and machine states such as
`in_progress` and `action_required` render as `In Progress` and
`Action Required` without changing their meaning. All 22 original completion
checks and exact-head repository CI pass for completion commit
[`efa3ace`](https://github.com/6529-Collections/deploy-hub/commit/efa3acea8310340d0b6d1b680cb4dbf2d29f1854).
Environment cards now remain in an explicit loading state until that GitHub
truth arrives; they no longer flash a false `No recent run` placeholder. Each
environment card also links directly to its canonical frontend workflow page.
Each environment card now places `View Workflow` at its top-right edge. The
latest-run value keeps the state as plain text and links only the GitHub run
number and short SHA, eliminating the separate bottom action row and its
reserved empty height. Environment runs are read directly from their canonical
workflows rather than inferred from only the repository's newest 100 Actions
runs.
The header also checks the Deploy Hub Pages workflow every minute.
Authenticated operators receive a compact status control immediately before
their account that links an active or failed UI deployment, while an already
completed newer version offers Reload. Public read-only mode only shows the
new-version Reload control; it hides deployments in progress and failures.
On compact screens that status occupies a second header row while the brand and
account remain together above it. The static UI also includes standalone web
app and iPhone home-screen metadata under the `6529 Deploy Hub` name using the
existing blue icon assets.
The self-status check uses the existing token for authenticated operators and
otherwise reads public GitHub state; it disappears harmlessly if GitHub cannot
be reached. Operator Activity refreshes every 15 seconds and public Activity
every minute. Failed UI deployments use a neutral control with a small red
marker. The Pages deployment action now allows 15 minutes for
GitHub's hosted deployment queue inside a 16-minute job envelope. The public
Login control now matches the height and styling of the joined authenticated
account control. Header authentication controls remain hidden until stored
session detection resolves. Compact deployment notices keep their marker and
message left-aligned together, and environment runs render as
`Status · Run #… - SHA` with clear spacing and baseline alignment.
The public and authenticated read-only Deployment Activity panel extends to
the bottom of the dynamic viewport on desktop and mobile. The page still grows
and scrolls vertically whenever content needs more space; the authenticated
operator layout retains natural page flow.
The review action remains disabled with a visible prompt until an open PR is
selected. The PR picker uses two-line titles, wrapping metadata, and
vertical-only scrolling. Signed-in identity and disconnect now share one joined
control, with the username linking to the operator's GitHub profile.
The current UI regressions and repository tests also pass.
The static UI is published directly from `ui/` through GitHub Pages at
<https://6529-collections.github.io/deploy-hub/>. The Pages workflow runs after
changes to `ui/**` or its own workflow file reach `main`; it versions coupled
CSS and JavaScript URLs with the deployment SHA to prevent mixed-cache startup
failures and introduces no application build system or server.

## Retained foundation

- Public `deploy-hub` repository with read-only CI and direct-to-`main`
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
- Every new staging candidate starts from current `main`, reapplies all active
  tracked exact staged PRs, and then adds the new cohort. A missing/divergent
  initial composition baseline fails before live mutation.
- The UI polls GitHub and repairs its view from the next complete read.
- No Deploy Hub backend, database, custom queue, continuously running
  reconciler, callback receiver, or agent polling loop exists.

## Assets

The exact supplied mark is stored as the brand master with UI-icon,
apple-touch, and PNG favicon sizes under `ui/assets/brand/` and is connected to
the current UI.

## Safety boundary

No real deployment or repository mutation capability is present on frontend
`main`. Task 1's merged simulator remains unable to mutate refs or environments.
PR #3653 is also read-only apart from clearly labelled dry-run statuses. PR
#3586 proposes explicit mutation workflows, but they remain inactive while the
PR is open; this follow-up did not dispatch either workflow.

## Next work

Task 6 begins by merging PR #3653 only after its normal review gates and an
explicit owner instruction, then manually collecting real dry-run evidence.
Keep PR #3586 open and do not mutate staging or production during that phase.
Merge #3586 only after dry-run evidence passes and the owner separately
authorizes a controlled real canary. Any merge or real staging operation still
requires an explicit owner instruction.
