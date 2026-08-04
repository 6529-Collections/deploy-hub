# Deploy Hub FE Implementation Tracker

Last updated: 2026-08-04

This is the only active top-level implementation tracker. It intentionally
contains eight frontend tasks rather than decomposing every concern into a
separate project.

## Tracker rules

- Status values are `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, and `DONE`.
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
|    1 | Base FE shadow workflow               | IN PROGRESS | 0          |
|    2 | Live frontend UI                      | NOT STARTED | 1          |
|    3 | Real frontend staging                 | NOT STARTED | 1, 2       |
|    4 | Real frontend production              | NOT STARTED | 3          |
|    5 | Agent operations and recovery         | NOT STARTED | 3, 4       |
|    6 | Canary, burn-in, and establishment    | NOT STARTED | 2–5        |
|    7 | Deferred frontend Release Bus cleanup | NOT STARTED | 6          |

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

### [ ] Task 1 — Base FE shadow workflow

Status: `IN PROGRESS`

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
      failure, infrastructure failure, cancelled, and stale outcomes.
- [ ] Shadow projection distinguishes immediate cancellation before mutation
      from a safe-stop request after mutation has begun.
- [x] The immutable manifest partitions adjacent requests by final target.
- [ ] Opted-in test PR feedback shows target, phase, exact SHA, conclusion, and
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
- Remaining before `DONE`: the shadow must distinguish both stop boundaries,
  and an explicitly authorized opted-in test PR must prove live commit-status
  feedback from an actual shadow run.

### [ ] Task 2 — Live frontend UI

Status: `NOT STARTED`

Outcome: The static page submits and observes frontend operations clearly and
updates without a browser refresh.

Acceptance criteria:

- [ ] Existing GitHub-token authentication and operator verification remain
      intact.
- [ ] The UI accepts one or more frontend PRs and an explicit Staging or
      Production final target.
- [ ] Submission freezes and displays exact PR heads before dispatch.
- [ ] An open page discovers new operations and updates at least every five
      seconds without manual refresh.
- [ ] Current environment, waiting cohorts, target, phase, elapsed time,
      blocker, runtime proof, E2E, PR, and exact GitHub run links are visible.
- [ ] Every non-terminal operation exposes Stop and clearly shows whether it
      cancelled before mutation or is settling the environment safely.
- [ ] The next complete GitHub read repairs a failed or missed poll without
      event replay.
- [ ] The saved Deploy Hub icon and favicons are integrated accessibly.
- [ ] The UI remains portable static files with no backend or proxy.
- [ ] Browser-module tests, accessibility checks, formatting, lint, and CI pass.

Evidence: Not yet available.

### [ ] Task 3 — Real frontend staging

Status: `NOT STARTED`

Outcome: The proven base FE shadow workflow is extended so an exact frontend
request reaches staging through the canonical path, receives runtime proof and
full E2E, and produces independently useful outcomes when a batch fails.

Acceptance criteria:

- [ ] The frontend operation workflow is thin and reuses canonical
      `deploy-staging.yml` and staging E2E implementation.
- [ ] Exact PR heads integrate into `1a-staging` through new non-force commits;
      shared history is never rewritten.
- [ ] Adjacent same-target requests batch; different final targets remain
      separate ordered cohorts.
- [ ] One frontend staging cohort mutates the environment at a time through
      GitHub Actions concurrency.
- [ ] Stop before the first `1a-staging` mutation cancels the exact operation
      without changing the branch or environment.
- [ ] Stop after mutation begins becomes a safe-stop request: the in-flight
      staging change reaches an exact verified or restored state before the
      operation ends, with no later cohort or production continuation.
- [ ] Safe stop never blindly kills an issued remote deployment command,
      rewrites shared history, or claims that deployed code was undone.
- [ ] Staging success requires exact runtime proof and all 12 baseline staging
      E2E packs.
- [ ] Infrastructure retries preserve the exact snapshot and use a fixed
      budget.
- [ ] Product failure performs bounded ordered replay from verified known-good
      content; single-PR failure restores that content.
- [ ] New requests arriving during execution remain pending for the next
      manifest.
- [ ] Every participating PR status links exact deployment/E2E evidence and
      reaches a truthful terminal outcome.
- [ ] Manual `1a-staging` deployment remains usable throughout rollout.

Evidence: Not yet available.

### [ ] Task 4 — Real frontend production

Status: `NOT STARTED`

Outcome: Explicitly authorized production-target PRs that passed together in
staging can share one exact `main` deployment and production validation.

Acceptance criteria:

- [ ] Production rechecks authenticated authority, exact PR heads, current
      `main`, checks, and deterministic mergeability immediately before mutation.
- [ ] Staging-only PRs never enter a production merge or deployment.
- [ ] Production candidates are from one passing production-target staging
      cohort; candidates from separate snapshots are not silently combined.
- [ ] Every candidate is preflighted before the first merge.
- [ ] Exact PR heads merge to `main` in deterministic order and the resulting
      `main` SHA is frozen.
- [ ] An unexpected partial merge stops before production deployment and
      reports exact `main` truth.
- [ ] Stop before the first `main` mutation prevents production progression;
      after `main` or production mutation begins it settles and reports exact
      repository/runtime truth without automatic rollback.
- [ ] The frozen SHA uses canonical `build-upload-deploy-prod.yml`, runtime
      proof, and all 11 production-safe E2E packs.
- [ ] Infrastructure retry repeats only the same frozen SHA within a fixed
      budget; product/runtime failure never auto-isolates or rolls back PRs.
- [ ] Existing CI deployment communication and asynchronous production release
      notes remain repository-owned and non-gating.
- [ ] Production can continue independently while the staging lane processes
      its next cohort.
- [ ] Manual production workflow remains the break-glass fallback.

Evidence: Not yet available.

### [ ] Task 5 — Agent operations and recovery

Status: `NOT STARTED`

Outcome: Codex operates the same frontend contract without the browser or a
Deploy Hub credential.

Acceptance criteria:

- [ ] One small command or skill supports submit, status, stop, and retry.
- [ ] It uses existing GitHub authentication and the same fixed repositories,
      workflows, refs, exact-SHA checks, and production-intent rules as the UI.
- [ ] It retains exact run identity and can resume from GitHub/runtime truth.
- [ ] Stop targets the exact operation and uses the same immediate-cancel or
      post-mutation safe-stop contract as the UI; it requires no agent polling.
- [ ] Retry preserves the same exact SHA and target.
- [ ] A closed agent task is not required for operation execution or recovery.
- [ ] Direct canonical workflows remain documented fallback paths.

Evidence: Not yet available.

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

Task 1 — Base FE shadow workflow.
