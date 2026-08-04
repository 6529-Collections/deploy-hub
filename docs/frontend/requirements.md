# Frontend Deploy Hub Requirements

Status: Accepted FE-only MVP

Last updated: 2026-08-04

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

## Staging

- Use `1a-staging` through non-force commits and the canonical frontend staging
  workflow.
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

## UI

- Plain static files hosted anywhere.
- Existing direct GitHub-token authentication and operator verification.
- Fixed frontend repository, workflows, refs, targets, and inputs.
- Submit one or more frontend PRs with an explicit final target.
- Poll GitHub at least every five seconds after authentication.
- Show new operations and updates without browser refresh.
- Show environments, active and waiting cohorts, PRs, exact SHAs, phase,
  elapsed time, runtime/E2E evidence, failures, and GitHub links.
- A complete read replaces current display state and repairs missed polls.
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
