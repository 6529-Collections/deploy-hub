# Frontend lifecycle flows

Status: Accepted FE-only MVP

These diagrams are the active frontend Deploy Hub lifecycle. They explain the
happy paths, target-aware cohorting, staging recovery, and production batching
that Tasks 1–6 must implement and prove.

## Diagram set

1. [End-to-end frontend flow](./01-end-to-end-flow.md) — one request from PR to
   staging or production, including terminal failure paths.
2. [Staging batching timeline](./02-staging-batching-timeline.md) — PR 1 is
   active while production-target PR 2 and staging-target PR 3 form separate
   target-aware cohorts.
3. [Staging failure reconciliation](./03-staging-failure-reconciliation.md) — a
   failed combined snapshot is reduced to deterministic, independently useful
   outcomes without an agent polling.
4. [Mixed targets and production batching](./04-mixed-targets-and-production-batching.md)
   — PR 2 targets production, PR 3 is faulty and targets staging, plus the case
   where multiple production-target PRs share one production deploy.

## Operating rules

### One explicit request

- A human submits from the static Deploy Hub page using their GitHub token; an
  agent submits through one small command using its existing GitHub
  authentication.
- The request freezes the repository, PR number, current PR-head SHA, final
  target (`Staging` or `Production`), requester, and request time.
- A moved PR head makes that request stale. Deploy Hub never silently adopts
  newer commits.
- GitHub commit status is the durable request and progress surface. The browser
  only polls GitHub to display it; execution does not depend on an open browser
  or an agent polling.
- The controller lives in the frontend repository and calls the existing
  staging, production, and E2E workflows as reusable exact-SHA jobs. Manual
  pushes to `1a-staging` retain their normal push-triggered path; the controller
  does not depend on its own `GITHUB_TOKEN` push creating another run, because
  GitHub suppresses that recursive trigger.
- Every new candidate starts from a frozen current `main`, reapplies every
  still-active tracked exact PR already accepted in staging, then adds the new
  cohort. Earlier staged PRs are not lost when `main` advances.
- If staging has no Deploy Hub composition metadata and differs from current
  `main`, live operation fails before mutation and requires an explicit
  baseline decision.

### Staging batching

- There is one active frontend staging operation and at most one latest pending
  controller run, enforced by GitHub Actions concurrency. GitHub's default
  single-pending behavior replaces the older pending run with the newest one.
- While staging is active, each new explicit request writes a pending status on
  its exact PR-head SHA. The latest pending controller run supersedes older
  pending controller runs, but does not erase their requests.
- When the active operation ends, the pending controller freezes all still-valid
  pending statuses in deterministic request order and partitions adjacent
  requests by final target.
- Adjacent staging-target PRs may share one staging snapshot. Adjacent
  production-target PRs may share a different staging snapshot. Different final
  targets never enter the same snapshot.
- The frozen cohorts use the staging lane sequentially. As soon as a production
  cohort passes staging, its production continuation may run in parallel with
  the next cohort's staging work.
- This is explicit-request batching, not Release Bus candidate discovery,
  claiming, or a release train.

### Staging failure handling

- Infrastructure/transient failure gets a bounded retry of the same exact
  snapshot.
- Product failure triggers a bounded ordered replay from the last known-good
  staging content.
- Replay uses new non-force recovery commits on `1a-staging`; it never rewrites
  shared branch history.
- The first passing candidate becomes the new known-good staging content. A
  later PR is reported as failed or incompatible with that accepted baseline.
- If no candidate passes, the last known-good content is restored through a new
  non-force commit and revalidated.
- New requests arriving during replay remain pending for the next batch.

### Production batching

- Only exact adjacent production-target PRs that passed together in the same
  target-specific staging snapshot may automatically share a production batch.
- Staging-only PRs use a separate cohort and can never enter `main` or
  production through a production batch.
- All production candidates are preflighted against current `main`, then merged
  in deterministic request order. The resulting exact `main` SHA is frozen and
  deployed once through the canonical frontend production workflow.
- Production candidates validated in different staging snapshots are not
  silently combined. They deploy separately unless a new combined staging
  validation is explicitly requested.
- Main cannot be mutated atomically across several PR merges. If preflight
  fails, nothing is merged. If an unexpected failure occurs after a partial
  merge, Deploy Hub stops and reports exact `main` truth; production does not
  start automatically.
- Production product/runtime failure never triggers automatic isolation,
  rollback, or a different merge. Infrastructure retry may repeat only the same
  frozen `main` SHA within a bounded budget.

## PR-visible feedback

Use one commit-status context per requested final target, for example
`Deploy Hub — Target: Production`. The description and link change as the
operation advances:

| Final target   | Example status progression                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staging        | `Queued for staging batch` → `Deploying staging snapshot` → `Validating staging` → `Staging validated`                                                                                                                    |
| Production     | `Queued for staging batch` → `Deploying staging snapshot` → `Validating staging` → `Staging validated; waiting for production` → `Merged to main; deploying production` → `Validating production` → `Production complete` |
| Reconciliation | `Staging batch failed; reconciling` → either the next valid phase or `Not staged: failed or incompatible`                                                                                                                 |
| Failure        | The exact failed phase and a link to the authoritative GitHub Actions run                                                                                                                                                 |

After a production-target PR is merged, its original exact-head commit status
continues to update. The merged PR remains closed; the status is simply visible
from its Checks/commit-status surface and links to the live operation.

## Small state model

The design uses only GitHub-native durable facts:

- exact PR-head commit statuses for request and per-PR progress;
- workflow inputs for the current immutable batch manifest;
- GitHub Actions runs and artifacts for deploy, runtime, and E2E evidence;
- protected refs and canonical frontend workflows for mutation authority.

There is no database, Lambda, custom queue service, callback receiver,
continuously running reconciler, browser-held lock, or agent polling loop. The
only reconciliation is a finite failure branch inside the frontend workflow.

The workflow mechanics above follow GitHub's documented
[`GITHUB_TOKEN` trigger rules](https://docs.github.com/en/actions/concepts/security/github_token)
and [single-pending concurrency behavior](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency).

## Implementation boundary

The diagrams specify behavior, not a second deployment implementation. The
frontend operation workflow must reuse the canonical frontend deploy and E2E
paths, while the static page and agent command submit and observe through
GitHub.
