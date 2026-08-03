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
- Valid exact environment-snapshot validation request.
- Identical and conflicting duplicate validation IDs.
- Coordinated deployments link to one validation result.
- Environment snapshot changes before validation starts.
- Environment snapshot changes while E2E is running.
- Product E2E failure is not retried automatically.
- Retryable E2E workflow/setup failure preserves the validation identity.
- Missed terminal callback with successful GitHub run.
- Callback duplicated with identical result.
- Callback duplicated with conflicting result.
- Agent task reference is preserved through completion.

## 2. UI delivery and live-update tests

Static delivery:

- Resolve `deploy-hub/main` once and serve HTML, CSS, and JavaScript from that
  exact commit SHA.
- Never mix assets when `main` advances during a page load.
- Cache commit-addressed files without serving stale mutable `main` resolution
  indefinitely.
- Reject unauthenticated UI access and never expose the private-repository
  credential to the browser.
- Display the exact UI source SHA.
- Publish a new UI release by advancing `deploy-hub/main` without deploying the
  backend.

Live behavior in an already-open browser:

- Show a newly accepted deployment without manual refresh.
- Update operation state, queue order, blocker, validation owner, and deployed
  version without manual refresh.
- Show accepted or observed changes within two seconds during normal live
  operation.
- Reconnect automatically after a dropped event stream.
- Fetch a fresh authoritative snapshot before applying events after reconnect.
- Exercise a missed event and prove that snapshot resynchronization repairs the
  screen.
- Fall back to automatic polling at intervals no longer than five seconds while
  the live stream is unavailable.
- Prevent duplicate or out-of-order events from regressing visible state.

## 3. Shadow tests

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

## 4. Staging canaries

Run controlled real deployments through canonical workflows.

Required cases:

- Frontend-only staging deployment followed by all 12 baseline packs.
- Backend-only staging deployment followed by all 12 baseline packs.
- Coordinated backend-then-frontend deployment followed by one shared baseline
  validation.
- Frontend deployment and unrelated backend deployment overlap.
- Baseline E2E verifies the exact frontend runtime SHA and backend runtime
  versions by service before and after the run.
- Same-environment mutation waits only for the protected validation window;
  other-environment mutation, CI, preparation, and agent work continue.
- Exact runtime version matches the requested SHA.
- Failed health check produces a failed operation and truthful PR feedback.
- Product E2E failure produces `deployed but validation failed`, blocks that
  result from production, and does not auto-retry.
- Retryable workflow/setup failure receives only the bounded retry allowed by
  policy and retains the same validation identity.
- A changed snapshot fails closed instead of attributing the E2E result to the
  new environment state.

Initial timing expectations are approximately seven minutes for a full staging
baseline. The UI uses rolling observed durations rather than treating that
estimate as a deadline.

## 5. Recovery drills

- Stop Deploy Hub after accepting but before dispatching a request.
- Stop it after dispatch while the workflow is running.
- Drop or delay a terminal event.
- Lose a validation event after E2E has reached a terminal GitHub state.
- Create a duplicate dispatch signal.
- Deliver duplicate and conflicting validation completion signals.
- Leave a waiting lock owner stale.
- Cancel the underlying GitHub workflow directly.
- Move `main` between request preparation and dispatch.
- Advance `deploy-hub/main` while browsers are open and while static assets are
  being requested.
- Interrupt the live UI event stream while deployment state changes.

After restart, Deploy Hub must reconcile from GitHub and runtime truth without
creating another logical deployment.

## 6. Production pilots

- Start with a low-risk exact backend service release.
- Perform a low-risk exact frontend release.
- Run all 11 production-safe baseline packs against each resulting exact
  production snapshot.
- Verify production runtime identity, post-E2E snapshot identity, and Check Run
  outcome.
- Exercise a controlled validation failure and prove production is reported as
  deployed but unvalidated until reconciliation, explicit acceptance, or
  known-good exact redeployment.
- Exercise the documented break-glass manual path separately.
- Confirm unrelated staging activity remains independent.

Initial timing expectations are approximately four minutes for a full
production baseline. The UI uses rolling observed durations and retains
outliers rather than promising a fixed completion time.

## 7. Acceptance gate

Deploy Hub becomes the default only when:

- All four canonical deployment adapters have succeeded in real use.
- Every success has exact runtime identity proof.
- Every staging success has all 12 baseline packs bound to an unchanged exact
  environment snapshot.
- Every production success has all 11 production-safe packs bound to an
  unchanged exact environment snapshot.
- Frontend-only, backend-only, and coordinated outcomes have each passed the
  mandatory validation path; coordinated outcomes create one validation.
- Duplicate and stale requests have been exercised.
- A failure, retry, cancellation, and missed-event recovery have been exercised.
- UI and PR status match GitHub and runtime truth.
- An already-open UI receives new operations, queue changes, progress, and
  terminal results without manual browser refresh.
- UI stream interruption recovers automatically without missing authoritative
  state.
- No unexplained environment drift occurred.
- FE and unrelated BE work are not globally serialized.
- Manual canonical deployment remains documented and usable.
