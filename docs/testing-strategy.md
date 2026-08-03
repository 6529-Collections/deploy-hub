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
- Authenticated GitHub authority is distinct from requester and contributors.
- Train-shaped metadata cannot label a Deploy Hub or manual request as Release
  Train.
- Frontend bounded-range and backend service-scoped contributor evidence.
- Missing or timed-out contributor evidence omits contributors but still posts
  the CI notification.
- Duplicate CI notification, release-note queue, and publication delivery.
- Same-SHA, unsafe-range, explicit no-PR, recovery, and rollback release-note
  ineligibility.
- Backend multi-service production uses one immutable release group and
  publishes only after its intended service set completes.
- Missed observation with a successful GitHub run.
- Duplicate identical workflow observation.
- Conflicting workflow evidence.
- Agent task reference is preserved through completion.

## 2. Authentication and security tests

Caller and browser boundaries:

- Accept a valid GitHub Bearer token and derive its login from GitHub `/user`.
- Reject missing, malformed, invalid, revoked, inaccessible, and insufficiently
  scoped tokens before any mutation.
- Prove a task reference, prompt, branch, PR label, requester login, or
  contributor list cannot grant authority or override the resolved GitHub
  identity.
- Prove staging authority cannot invoke production. Bind explicit production
  intent to the exact request and recheck current operator permission and
  `main` SHA immediately before mutation.
- Prove the browser forget action removes the stored token and subsequent calls
  fail closed.
- Seed a fake token marker and prove it never reaches URLs, responses, records,
  PR feedback, fixtures, logs, Sentry, or artifacts.

External identity and permission boundaries:

- Exercise wrong-repository, wrong-workflow, moved-ref, stale-SHA,
  arbitrary-workflow, cross-repository, and conflicting-request failures.
- Verify every route uses a fixed repository/workflow/ref/service allowlist and
  only the GitHub permissions required for that route.
- In read-only shadow, attempt workflow dispatch, protected-ref update,
  environment/AWS access, and real CI/release-note publication; every attempt
  must fail because the credential or workflow lacks the capability.
- Do not add webhook, callback, GitHub App, OAuth, WebSocket-authentication, or
  AWS-IAM test suites until an approved implementation actually adds that
  boundary.

## 3. UI delivery and live-update tests

Static delivery:

- Resolve `deploy-hub/main` once and serve HTML, CSS, and JavaScript from that
  exact commit SHA.
- Never mix assets when `main` advances during a page load.
- Cache commit-addressed files without serving stale mutable `main` resolution
  indefinitely.
- Allow the secret-free UI shell to load, reject every unauthenticated
  operational-data or command request, and never expose the private-repository
  UI-read credential to the browser.
- Display the exact UI source SHA.
- Publish a new UI release by advancing `deploy-hub/main` without deploying the
  backend.

Automatic behavior in an already-open browser:

- Show a newly accepted deployment without manual refresh.
- Update operation state, queue order, blocker, validation owner, and deployed
  version without manual refresh.
- Show accepted or observed changes by the next poll, no later than five
  seconds during normal operation.
- Reject unauthenticated polling requests.
- Pause or fail polling, then prove the next successful full snapshot repairs
  the screen without an event cursor or replay protocol.
- Use conditional requests so unchanged polling is cheap and cannot regress
  visible state.
- Show CI-drop and release-note milestone changes without manual refresh.
- Keep a healthy deployment visibly successful when a communication side
  effect fails, while presenting the warning and exact recovery evidence.

## 4. Shadow tests

Use real repositories, PRs, workflow history, and authorization evidence
without allowing cloud or ref mutation.

Prove:

- Repository and PR resolution.
- Exact-head readiness.
- Production authorization.
- Correct adapter selection.
- Projected PR-feedback creation and updates without writing to colleagues' PRs
  during initial shadowing.
- UI projection.
- Status lookup by the originating task.
- Projected CI-drop and release-note outcomes through non-publishing fake sinks.

The shadow path must have no workflow-dispatch, protected-repository-write, or
AWS deployment capability. It must also be unable to publish real CI or
release-note drops. A software mode flag alone is not sufficient isolation.

### Frontend `1a-deploy-hub` branch

- Create a long-lived `1a-deploy-hub` branch from an agreed baseline.
- Integrate only explicitly allowlisted test PR heads.
- Trigger only a dedicated `deploy-hub-shadow` workflow.
- Confirm the existing `1a-staging` deployment workflow is not triggered.
- Exercise non-force integration, exact-head identity, superseded heads,
  concurrent requests, duplicate requests, projected PR feedback, cancellation,
  retry, and agent status-recovery behavior.
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

## 5. Staging canaries

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
- Frontend and backend staging CI drops use exact operation evidence, show the
  GitHub authority and Deploy Hub origin separately from the requester, and
  credit only verified contributors.
- Staging reports release-note ineligible and never enqueues generation.
- Product E2E failure produces `deployed but validation failed`, blocks that
  result from production, and does not auto-retry.
- Retryable workflow/setup failure receives only the bounded retry allowed by
  policy and retains the same validation identity.
- A changed snapshot fails closed instead of attributing the E2E result to the
  new environment state.

Initial timing expectations are approximately seven minutes for a full staging
baseline. The UI uses rolling observed durations rather than treating that
estimate as a deadline.

## 6. Recovery drills

- Stop Deploy Hub after accepting but before dispatching a request.
- Stop it after dispatch while the workflow is running.
- Drop or delay a terminal event.
- Lose a validation event after E2E has reached a terminal GitHub state.
- Create a duplicate dispatch signal.
- Deliver duplicate and conflicting validation completion signals.
- Drop, duplicate, and replay CI-alert receiver and release-note outcome events.
- Reconcile an accepted CI drop with a missing asynchronous publication event.
- Leave a waiting lock owner stale.
- Cancel the underlying GitHub workflow directly.
- Move `main` between request preparation and dispatch.
- Advance `deploy-hub/main` while browsers are open and while static assets are
  being requested.
- Interrupt UI polling while deployment state changes.

After restart, Deploy Hub must reconcile from GitHub and runtime truth without
creating another logical deployment.

## 7. Production pilots

- Start with a low-risk exact backend service release.
- Perform a low-risk exact frontend release.
- Run all 11 production-safe baseline packs against each resulting exact
  production snapshot.
- Verify production runtime identity, post-E2E snapshot identity, and Check Run
  outcome.
- Verify frontend release-note baseline selection across approved historical
  production workflows and exact deployed SHAs.
- Verify backend per-PR contributor grouping and multi-service completion.
- Exercise published, already-published, skipped, queue-failed, generation-
  failed, and safe-recovery outcomes without changing deployment truth.
- Exercise a controlled validation failure and prove production is reported as
  deployed but unvalidated until reconciliation, explicit acceptance, or
  known-good exact redeployment.
- Exercise the documented break-glass manual path separately.
- Confirm unrelated staging activity remains independent.

Initial timing expectations are approximately four minutes for a full
production baseline. The UI uses rolling observed durations and retains
outliers rather than promising a fixed completion time.

## 8. Acceptance gate

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
- UI, PR feedback, and task status lookup match authoritative CI-drop and
  release-note outcomes without treating them as environment-mutation gates.
- Canonical frontend/backend staging drops and production release notes have
  correct authority, requester, PR, contributor, and service attribution.
- An already-open UI receives new operations, queue changes, progress, and
  terminal results without manual browser refresh.
- UI polling interruption recovers automatically from the next authoritative
  snapshot.
- No unexplained environment drift occurred.
- FE and unrelated BE work are not globally serialized.
- Manual canonical deployment remains documented and usable.
