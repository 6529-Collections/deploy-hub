# Deploy Hub Testing Strategy

Status: Draft v0.1
Last updated: 2026-08-03

## Purpose

Prove that Deploy Hub executes exact deployment operations safely, reports
truthfully, survives interruptions, and removes Release Bus's unnecessary
global serialization.

Release Bus is already OFF for staging and production and is not expected to be
re-enabled. The fallback throughout testing is the existing manual/canonical
repository deployment path.

## 1. Contract tests

Use fake repository adapters and deterministic workflow fixtures.

Required scenarios:

- Valid exact-SHA request.
- Malformed or missing SHA.
- PR head moves before dispatch.
- PR head moves after dispatch.
- Identical duplicate request.
- Conflicting duplicate request ID.
- Target busy and later available.
- Cancellation while waiting.
- Cancellation after dispatch.
- Retryable infrastructure failure.
- Non-retryable deployment failure.
- Missed terminal callback with successful GitHub run.
- Callback duplicated with identical result.
- Callback duplicated with conflicting result.
- Agent task reference is preserved through completion.

## 2. Shadow tests

Use real repositories, PRs, workflow history, and authorization evidence
without allowing cloud or ref mutation.

Prove:

- Repository and PR resolution.
- Exact-head readiness.
- Production authorization.
- Correct adapter selection.
- Projected Check Run creation and updates without writing to colleagues' PRs
  during initial shadowing.
- UI projection.
- Event delivery to the originating task.

The shadow identity must have no workflow-dispatch, repository-write, or AWS
deployment capability. A software mode flag alone is not sufficient isolation.

### Frontend `1a-deploy-hub` branch

- Create a long-lived `1a-deploy-hub` branch from an agreed baseline.
- Integrate only explicitly allowlisted test PR heads.
- Trigger only a dedicated `deploy-hub-shadow` workflow.
- Confirm the existing `1a-staging` deployment workflow is not triggered.
- Exercise non-force integration, exact-head identity, superseded heads,
  concurrent requests, duplicate requests, projected Check Runs, cancellation,
  retry, and agent callback behavior.
- Verify the workflow cannot update `1a-staging` or `main` and cannot access
  staging or production AWS credentials.

### Backend exact-SHA shadow

- Use exact test PR SHAs and selected service inputs with a credentialless
  simulation workflow.
- Validate request mapping and per-service concurrency without invoking
  `deploy.yml` or assuming deployment roles.
- Add a backend integration branch only if a later canonical-path inventory
  identifies behavior that cannot be simulated from an exact SHA.

Shadow acceptance proves control-plane behavior only. AWS deployment, runtime
health, rollback, and actual shared-environment concurrency require a separate
isolated execution environment before shared-staging use.

## 3. Staging canaries

Run controlled real deployments through canonical workflows.

Required cases:

- Frontend-only staging deployment.
- Backend-only staging deployment.
- Coordinated backend-then-frontend deployment.
- Frontend deployment and unrelated backend deployment overlap.
- Shared integration validation blocks mutation only for its protected window.
- Exact runtime version matches the requested SHA.
- Failed health check produces a failed operation and truthful PR feedback.

## 4. Recovery drills

- Stop Deploy Hub after accepting but before dispatching a request.
- Stop it after dispatch while the workflow is running.
- Drop or delay a terminal event.
- Create a duplicate dispatch signal.
- Leave a waiting lock owner stale.
- Cancel the underlying GitHub workflow directly.
- Move `main` between request preparation and dispatch.

After restart, Deploy Hub must reconcile from GitHub and runtime truth without
creating another logical deployment.

## 5. Production pilots

- Start with a low-risk exact backend service release.
- Perform a low-risk exact frontend release.
- Verify production runtime identity and Check Run outcome.
- Exercise the documented break-glass manual path separately.
- Confirm unrelated staging activity remains independent.

## 6. Acceptance gate

Deploy Hub becomes the default only when:

- All four canonical deployment adapters have succeeded in real use.
- Every success has exact runtime identity proof.
- Duplicate and stale requests have been exercised.
- A failure, retry, cancellation, and missed-event recovery have been exercised.
- UI and PR status match GitHub and runtime truth.
- No unexplained environment drift occurred.
- FE and unrelated BE work are not globally serialized.
- Manual canonical deployment remains documented and usable.
