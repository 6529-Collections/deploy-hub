# Deploy Hub FE Implementation Tracker

Last updated: 2026-08-04

This is the only active top-level implementation tracker. It intentionally
contains eight frontend tasks rather than decomposing every concern into a
separate project.

## Tracker rules

- Status values are `NOT STARTED`, `IN PROGRESS`, `DONE`, and
  `DONE — PENDING <linked PR>`.
- Work proceeds from the lowest incomplete task unless a later task can safely
  advance without widening scope.
- E2E, PR feedback, authentication, release notes, retries, and diagnostics are
  acceptance criteria inside the owning feature task—not extra top-level tasks.
- Mark a task `DONE` only after all acceptance criteria and durable evidence
  have been inspected.
- Update `TODO.md`, `STATUS.md`, and `CHANGELOG.md` together when a task starts,
  blocks, unblocks, or completes.
- Backend Deploy Hub support is not an active task. Reconsider it only after the
  frontend pilot has produced real evidence.

## Summary

| Task | Deliverable                           | Status      | Depends on |
| ---: | ------------------------------------- | ----------- | ---------- |
|    0 | FE-only repository baseline           | DONE        | —          |
|    1 | Base FE shadow workflow               | DONE — PENDING [FE PR #3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586) | 0          |
|    2 | Live frontend UI                      | DONE        | 1          |
|    3 | Real frontend staging                 | DONE — PENDING [FE PR #3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586) | 1, 2       |
|    4 | Real frontend production              | DONE — PENDING [FE PR #3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586) | 3          |
|    5 | Agent operations and recovery         | NOT STARTED | 3, 4       |
|    6 | Canary, burn-in, and establishment    | NOT STARTED | 2–5        |
|    7 | Deferred frontend Release Bus cleanup | NOT STARTED | 6          |

## Active frontend implementation PRs

- [Frontend PR #3579](https://github.com/6529-Collections/6529seize-frontend/pull/3579)
  is merged and owns the dormant Task 1 shadow baseline.
- [Frontend PR #3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  is open at exact head `eb1cb9fa22f38bace28028cd8a808bd1c6836958`.
  It completes Task 1, Task 3, and Task 4, including durable request intake,
  truthful terminal cohort outcomes, current production preflight, and tracked
  forward-only removal from staging. It also provides lower-level primitives
  needed by future Task 5. It is intentionally pending merge. No Deploy Hub
  operation was dispatched.

## Task details

### [x] Task 0 — FE-only repository baseline

Status: `DONE`

Outcome: The active repository describes one coherent frontend product and
retains useful existing work without letting the original broad plan control
implementation.

Acceptance criteria:

- [x] Root README, status, tracker, and agent instructions are frontend-only.
- [x] Active frontend requirements, architecture, flows, and rollout documents
      are under `docs/frontend/`.
- [x] The prior frontend/backend plan is preserved under
      `archive/original-cross-repo-plan/` and clearly marked inactive.
- [x] The existing static UI, authentication implementation, tests, package
      tooling, and credentialless CI are retained.
- [x] The exact supplied brand master and deterministic UI/favicon sizes are
      saved without wiring unfinished branding into the UI.
- [x] The active tracker contains only Tasks 0–7.
- [x] Repository checks pass after restructuring.

Evidence:

- `README.md`, `STATUS.md`, `AGENTS.md`
- `docs/frontend/`
- `archive/original-cross-repo-plan/`
- `ui/assets/brand/`

### [x] Task 1 — Base FE shadow workflow

Status: **DONE — PENDING** [FE PR #3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)

Outcome: A dormant workflow in the frontend repository lets an exact frontend
request exercise the full control and feedback shape without any
shared-environment authority.

Acceptance criteria:

- [x] Inputs freeze repository, PR, exact head SHA, final target, requester, and
      request time.
- [x] The workflow is explicitly dispatched, uses only the frontend
      repository's automatic `GITHUB_TOKEN`, and needs no stored credential.
- [x] Permissions are limited to reading repository/PR data and writing the
      dedicated shadow commit status.
- [x] Stale or moved PR heads fail closed.
- [x] Deterministic fake phases cover queued, running, succeeded, product
      failure, infrastructure failure, and stale outcomes.
- [x] Shadow projection distinguishes immediate cancellation before mutation
      from a safe-stop request after mutation has begun.
- [x] The immutable manifest partitions adjacent requests by final target.
- [x] Opted-in test PR feedback shows target, phase, exact SHA, conclusion, and
      the authoritative shadow run link.
- [x] Shadow permissions cannot update refs, dispatch canonical deploys, assume
      environment roles, or publish CI/release-note communications.
- [x] No database, custom queue, callback, server, or agent polling is added.
- [x] Focused tests and exact-head CI pass.

Evidence:

- Frontend PR
  [#3579](https://github.com/6529-Collections/6529seize-frontend/pull/3579)
  merged exact head `abbabaff6f032daf448d6d9eb2433066fa19aabf` into frontend
  `main` as `1e712d69a35980dab885057cc4c10ae6a8a7f0e2`.
- The focused shadow tests, changed-file checks, Jest diagnostic ratchet,
  workflow-security validation, and secret scan pass locally.
- Review follow-up ensures validation failures still produce a visible Action
  summary and best-effort terminal error statuses replace partial pending
  projections after a GitHub API interruption.
- Latest review follow-up uses the repository's actual default branch and
  rejects malformed request timestamps with the intended validation error.
- Open frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  distinguishes pre-mutation Stop from post-mutation safe Stop in the shadow
  projection and completes the shadow status payload. Its merge remains
  deliberately pending.

### [x] Task 2 — Live frontend UI

Status: `DONE`

Outcome: The static page submits and observes frontend operations clearly and
updates without a browser refresh.

Acceptance criteria:

- [x] Existing GitHub-token authentication and operator verification remain
      intact.
- [x] The UI accepts one or more frontend PRs and an explicit Staging or
      Production final target.
- [x] Submission freezes and displays exact PR heads before dispatch.
- [x] An open page discovers new operations and updates at least every five
      seconds without manual refresh.
- [x] Current environment, waiting cohorts, target, phase, elapsed time,
      blocker, runtime proof, E2E, PR, and exact GitHub run links are visible.
- [x] Every non-terminal operation exposes Stop and clearly shows whether it
      cancelled before mutation or is settling the environment safely.
- [x] A tracked, unmerged PR currently in staging exposes Remove from staging,
      including removal progress, validation, failure, and restored state.
- [x] The next complete GitHub read repairs a failed or missed poll without
      event replay.
- [x] The saved Deploy Hub icon and favicons are integrated accessibly.
- [x] The UI remains portable static files with no backend or proxy.
- [x] Browser-module tests, accessibility checks, formatting, lint, and CI pass.

Evidence:

- Static shell, direct GitHub authentication, and saved brand assets are
  already present in this repository.
- Implementation is proceeding in `deploy-hub`; frontend PR #3586 remains
  open until its frontend changes are needed.
- `ui/github-operations.js` freezes exact heads, dispatches the fixed frontend
  workflow contract, projects GitHub-native dashboard truth, and publishes
  exact Stop requests without storing separate operation state.
- `ui/index.html`, `ui/app.js`, and `ui/styles.css` provide the submission,
  five-second refresh, environment, operation, Stop, and removal surfaces.
- Twenty-two authentication, contract, projection, token-canary, browser-entry,
  accessibility, branding, and refresh tests pass with formatting and lint.
- UI completion commit
  [`efa3ace`](https://github.com/6529-Collections/deploy-hub/commit/efa3acea8310340d0b6d1b680cb4dbf2d29f1854)
  passed exact-head repository
  [CI](https://github.com/6529-Collections/deploy-hub/actions/runs/30916099582).

### [x] Task 3 — Real frontend staging

Status: **DONE — PENDING** [FE PR #3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)

Outcome: The proven base FE shadow workflow is extended so an exact frontend
request reaches staging through the canonical path, receives runtime proof and
full E2E, and produces independently useful outcomes when a batch fails.

Acceptance criteria:

- [x] The frontend operation workflow is thin and reuses canonical
      `deploy-staging.yml` and staging E2E implementation.
- [x] Exact PR heads integrate into `1a-staging` through new non-force commits;
      shared history is never rewritten.
- [x] Adjacent same-target requests batch; different final targets remain
      separate ordered cohorts.
- [x] One frontend staging cohort mutates the environment at a time through
      GitHub Actions concurrency.
- [x] Stop before the first `1a-staging` mutation cancels the exact operation
      without changing the branch or environment.
- [x] Stop after mutation begins becomes a safe-stop request: the in-flight
      staging change reaches an exact verified or restored state before the
      operation ends, with no later cohort or production continuation.
- [x] Safe stop never blindly kills an issued remote deployment command,
      rewrites shared history, or claims that deployed code was undone.
- [x] Staging success requires exact runtime proof and all 12 baseline staging
      E2E packs.
- [x] Infrastructure retries preserve the exact snapshot and use a fixed
      budget.
- [x] Product failure performs bounded ordered replay from verified known-good
      content; single-PR failure restores that content.
- [x] Each Deploy Hub staging commit records the exact active PR composition in
      bounded commit metadata; no database or separate state service is added.
- [x] An operator can remove one tracked, unmerged exact PR through a new
      forward-only staging commit followed by the canonical deploy and full
      staging E2E.
- [x] Failed removal automatically restores and revalidates the prior staging
      snapshot; merged PRs and active production operations fail closed.
- [x] New requests arriving during execution remain pending for the next
      manifest.
- [x] Every participating PR status links exact deployment/E2E evidence and
      reaches a truthful terminal outcome.
- [x] Manual `1a-staging` deployment remains usable throughout rollout.

Evidence:

- Open frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  at exact head `eb1cb9fa22f38bace28028cd8a808bd1c6836958` contains the
  complete in-review staging, bounded replay, Stop, exact composition, and
  removal implementation.
- The latest follow-up hardens workflow provenance, GitHub retry/timeout
  behavior, mergeability polling, newest-status selection, reconciliation race
  checks, and terminal error preservation. It also fixes the task-owned Jest
  typecheck failure; 122 focused tests, the Jest ratchet, and changed-code
  quality checks pass locally.
- The static UI registers each exact request in one fixed GitHub commit-status
  context before dispatch. The surviving controller discovers and claims every
  pending request in explicit batch order, so GitHub's replaceable concurrency
  slot cannot lose queued work and no custom queue is added. A queued request
  remains visible and preserves its exact Stop identity if a later controller
  claims it.
- Later cohorts now receive terminal status when an earlier cohort stops or
  fails, including an unexpected controller failure.

### [x] Task 4 — Real frontend production

Status: **DONE — PENDING** [FE PR #3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)

Outcome: Explicitly authorized production-target PRs that passed together in
staging can share one exact `main` deployment and production validation.

Acceptance criteria:

- [x] Production rechecks authenticated authority, exact PR heads, current
      `main`, checks, and deterministic mergeability immediately before mutation.
- [x] Staging-only PRs never enter a production merge or deployment.
- [x] Production candidates are from one passing production-target staging
      cohort; candidates from separate snapshots are not silently combined.
- [x] Every candidate is preflighted before the first merge.
- [x] Exact PR heads merge to `main` in deterministic order and the resulting
      `main` SHA is frozen.
- [x] An unexpected partial merge stops before production deployment and
      reports exact `main` truth.
- [x] Stop before the first `main` mutation prevents production progression;
      after `main` or production mutation begins it settles and reports exact
      repository/runtime truth without automatic rollback.
- [x] The frozen SHA uses canonical `build-upload-deploy-prod.yml`, runtime
      proof, and all 11 production-safe E2E packs.
- [x] The canonical deploy allows `main` to advance after the SHA is frozen
      only while that SHA remains in `main` history, and blocks deploying
      behind current production unless rollback is explicitly authorized.
- [x] Infrastructure retry repeats only the same frozen SHA within a fixed
      budget; product/runtime failure never auto-isolates or rolls back PRs.
- [x] Existing CI deployment communication and asynchronous production release
      notes remain repository-owned and non-gating.
- [x] Production can continue independently while the staging lane processes
      its next cohort.
- [x] Manual production workflow remains the break-glass fallback.

Evidence:

- Open frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  at exact head `eb1cb9fa22f38bace28028cd8a808bd1c6836958` contains the
  complete in-review bot-only production continuation.
- Before every merge it rechecks the retained requester, exact open PR head,
  current `main` base, non-draft clean mergeability, the required installed App
  PR CI check, all current check runs, and external commit statuses. The
  canonical production preflight separately preserves the frozen SHA across
  ordinary `main` advancement while preventing removed-history candidates and
  unintended rollback.

### [ ] Task 5 — Agent operations and recovery

Status: `NOT STARTED`

Outcome: Codex operates the same frontend contract without the browser or a
Deploy Hub credential.

Acceptance criteria:

- [ ] One small command or skill supports submit, status, stop, and retry.
- [ ] The same command or UI contract can remove one tracked, unmerged PR from
      staging without an agent polling loop.
- [ ] It uses existing GitHub authentication and the same fixed repositories,
      workflows, refs, exact-SHA checks, and production-intent rules as the UI.
- [ ] It retains exact run identity and can resume from GitHub/runtime truth.
- [ ] Stop targets the exact operation and uses the same immediate-cancel or
      post-mutation safe-stop contract as the UI; it requires no agent polling.
- [ ] Retry preserves the same exact SHA and target.
- [ ] A closed agent task is not required for operation execution or recovery.
- [ ] Direct canonical workflows remain documented fallback paths.

Evidence:

- Open frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  provides the in-repository Stop and forward-only removal/recovery primitives.
  The agent command remains unimplemented; the Task 2 UI entry points exist.

### [ ] Task 6 — Canary, burn-in, and establishment

Status: `NOT STARTED`

Outcome: Deploy Hub becomes the normal frontend entry point only after it is
proven without blocking colleagues.

Acceptance criteria:

- [ ] Shadow success, failure, stale, cancel, retry, batching, polling, and PR
      feedback cases pass with no mutation authority.
- [ ] Controlled low-risk staging canaries prove runtime identity, all baseline
      E2E, failure recovery, and manual fallback.
- [ ] Canary evidence proves both stop boundaries: pre-mutation leaves staging
      unchanged, while post-mutation settles to exact safe runtime truth and
      prevents production continuation.
- [ ] A removal canary proves both successful removal and automatic restoration
      after a deliberately failing removal snapshot.
- [ ] At least one same-target batch and one mixed-target sequence behave as
      documented.
- [ ] A low-risk production canary proves merge, deploy, runtime, E2E,
      communication, and release-note behavior.
- [ ] UI and agent status agree with GitHub/runtime truth during burn-in.
- [ ] No unexplained duplicate deployment, environment drift, hidden partial
      mutation, or colleague-blocking behavior remains.
- [ ] The establishment decision and evidence are recorded.

Evidence: Not yet available.

### [ ] Task 7 — Deferred frontend Release Bus cleanup

Status: `NOT STARTED`

Outcome: Frontend Release Bus code and coupling are removed only after Deploy
Hub is established.

Acceptance criteria:

- [ ] Required audit history is retained.
- [ ] Frontend Release Bus workflows, inputs, callbacks, readiness coupling,
      UI routes, and obsolete operator tooling are removed.
- [ ] Canonical manual and Deploy Hub paths no longer import or call frontend
      Release Bus behavior.
- [ ] Staging, production, E2E, CI notifications, and release notes pass final
      acceptance after cleanup.
- [ ] Backend Release Bus cleanup remains separately scoped and is not implied
      by this task.

Evidence: Not yet available.

## Current next task

Task 5 — Agent operations and recovery.
