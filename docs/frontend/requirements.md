# Frontend Deploy Hub Requirements

Status: Accepted FE-only MVP

Last updated: 2026-08-11

## Product outcome

Deploy Hub must let a developer or Codex take an exact frontend PR to staging
or production and observe the complete result without manually watching
workflow pages.

The frontend pilot decides whether Deploy Hub should later expand. Backend
support is not part of the active MVP.

## Requests

Every request contains:

- frontend repository and PR number;
- immutable 40-character PR-head SHA;
- explicit final target: `Staging` or `Production`;
- GitHub-authenticated requester;
- request time and one authoritative GitHub Actions run link.

A moved PR head is stale. Retry uses the same exact SHA and target. Deploy Hub
never silently follows a branch or upgrades staging intent to production.

- If a queued PR moves, its request is removed from the queue and ends as
  `Cancelled · PR updated`. Deploy Hub does not enqueue the new head
  automatically.
- If an active PR moves, the frozen SHA continues through safe completion or
  recovery. The new PR head must say that it is not deployed and identify the
  earlier SHA still being processed or last validated.

## Stopping an operation

- Before repository or environment mutation, Stop cancels the exact operation
  immediately and leaves the target unchanged.
- After mutation begins, Stop becomes a safe-stop request. The active mutation
  reaches exact verified or restored runtime truth before the operation ends.
- Safe stop blocks later cohorts, retries beyond required safety
  reconciliation, and production continuation.
- Safe stop never blindly kills an issued remote deployment command, rewrites
  shared history, rolls back production automatically, or claims completed
  mutation was undone.
- UI and agent actions use the same exact operation and GitHub evidence; no
  browser or agent polling is required to complete the stop.

## Staging

- Use `1a-staging` through non-force commits and the canonical frontend staging
  workflow.
- Build each new candidate from a frozen current `main`, every still-active
  tracked exact PR already accepted in staging, and the new cohort. Advancing
  `main` must not silently remove an earlier staged PR.
- If existing staging has no Deploy Hub composition metadata, accept it as the
  initial baseline only when its content matches current `main`; otherwise fail
  before mutation and require an explicit cutover decision.
- Preserve the repository-owned build, deployment, health/runtime proof, E2E,
  CI notification, and manual fallback.
- Success requires exact staging runtime proof and all 12 baseline staging E2E
  packs.
- One frontend staging cohort mutates staging at a time.
- Freeze pending requests in accepted order and partition adjacent requests by
  final target.
- Adjacent same-target requests may share one cumulative snapshot. Different
  final targets never share a snapshot.
- After a production-target cohort passes staging, its production continuation
  may run independently while staging processes the next cohort.

## Staging failures

- Infrastructure/transient failure retries only the same exact snapshot within
  a fixed budget.
- Product failure in a multi-PR cohort performs bounded ordered replay from the
  verified known-good staging content.
- Replay uses new non-force recovery commits and never rewrites shared history.
- The first passing candidate becomes verified staging content; remaining work
  is reported as failed or incompatible with that accepted baseline.
- A failed single-PR cohort restores and verifies the prior known-good content.
- An infrastructure error never becomes evidence that a PR is faulty.
- New requests arriving during recovery wait for the next frozen manifest.

## Production

- Production requires explicit current authority and prior green staging
  evidence for the exact production-target cohort.
- Staging-only PRs never enter `main` or production.
- Recheck every exact PR head, current `main`, checks, and deterministic merge
  order immediately before mutation.
- Preflight the whole cohort before merging the first PR.
- Merge exact heads in accepted order, freeze the resulting exact `main` SHA,
  and use canonical `build-upload-deploy-prod.yml`.
- Success requires exact production runtime proof and all 11 production-safe
  E2E packs.
- If an unexpected merge fails after partial `main` mutation, stop and report
  exact truth; do not start production automatically.
- Production infrastructure retry may repeat only the same frozen `main` SHA.
- Production product/runtime failure never automatically isolates PRs, changes
  merges, or rolls back.
- Existing production release notes remain asynchronous and non-gating.

## PR feedback

Use one commit-status context for the requested final target, for example
`Deploy Hub — Target: Production`.

The PR must show exact SHA, target, current phase, conclusion, blocker when
present, and a link to the authoritative run. A production-target PR continues
to receive status updates on its original exact head after it is merged.

Deploy Hub reports deployment of exact commits, never merely that a PR is
deployed. A current PR head that differs from the deployed or active SHA must
not appear staging-validated or production-complete.

## UI

- Plain static files hosted anywhere.
- Public read-only mode uses unauthenticated REST calls for the public frontend
  repository, shows environment and workflow-backed activity, and polls every
  minute.
- Public mode has no deployment form, Stop, retry, removal, or other mutation
  controls. It shows queued work whenever that work is visible through the
  public workflow projection.
- Login opens a modal. Any valid GitHub token unlocks authenticated reads and
  their higher API allowance. Organization-admin or operator-team verification
  separately unlocks the fixed deployment controls; valid non-operators remain
  read-only.
- Every authenticated identity receives the exact queued-PR projection.
  Authenticated operators can additionally submit one or more frontend PRs
  with an explicit final target.
- Poll GitHub every 15 seconds after authentication and every minute publicly.
- Show new operations and updates without browser refresh.
- Separate deployment activity into `Active Deployment`, `Queued Batches`, and
  `Recent Operations`.
- Show batch order and composition, target, PRs, exact SHAs, phase, elapsed
  time, runtime/E2E evidence, failures, and GitHub links.
- A complete read replaces current display state and repairs missed polls.
- A failed first read replaces loaders with an explicit GitHub rate-limit or
  availability state. The UI claims to show a stale snapshot only when a
  complete snapshot was previously rendered.
- Use the saved Deploy Hub icon and favicon assets when the live UI is built.

## Agent operation

One small command or skill uses Codex's existing GitHub authentication to
submit, inspect, cancel, and retry the same fixed frontend operation contract.
Operation execution never depends on an agent or browser remaining open.

## Sources of truth

- PR identity and exact head: GitHub Pull Request.
- Request and per-PR progress: GitHub commit status.
- Execution, waiting, cancellation, retry, and logs: GitHub Actions.
- Deployed identity: canonical runtime proof.
- Validation: canonical frontend E2E workflow evidence.
- CI communication and release notes: existing repository-owned pipeline.

## Explicit exclusions

- Backend deployments during the frontend MVP.
- Deploy Hub server, proxy, Lambda, database, state branch, custom queue,
  scheduler, callback receiver, SSE, or WebSocket.
- Autonomous candidate discovery or Release Bus trains.
- Agent polling as an execution requirement.
- Automatic production isolation or rollback.
- Reimplementation of frontend build, deployment, E2E, CI notification, or
  release-note logic.
