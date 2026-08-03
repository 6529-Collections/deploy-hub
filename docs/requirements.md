# Deploy Hub Requirements

Status: Agreed v1.0
Last updated: 2026-08-03

## 1. Product definition

Deploy Hub is the deployment execution and observability layer used by Codex
tasks and humans. It accepts exact deployment operations, enforces deployment
policy, invokes repository-owned deployment workflows, reports progress to the
pull request and UI, and returns a terminal result to the initiating agent.

Deploy Hub is not an autonomous release manager. The initiating Codex task owns
implementation, pull requests, CI and review handling, staging validation,
merging, production progression, and response to failures.

## 2. Required developer outcomes

The following instructions must be supported without manual workflow
monitoring:

- `Get this to staging.`
- `Work on this change and see it through to production.`
- `Deploy this frontend and backend change together.`
- `Cancel this deployment.`
- `Retry the failed deployment.`
- `Show what is deployed and what is waiting.`

The initiating Codex task must continue until the requested outcome succeeds or
a genuine blocker requires user input.

## 3. Ownership boundaries

### Codex task owns

- Feature implementation and branch ownership.
- Pull request creation and updates.
- CI, review, and exact-head readiness.
- The ordered plan from implementation through staging and production.
- Selection of feature-specific staging validation.
- Main merge when explicitly authorized.
- Response to deployment failures and blockers.

### Deploy Hub owns

- Accepting one exact deployment operation.
- Accepting one exact environment-snapshot validation operation.
- Validating request identity and authorization.
- Idempotency and minimal durable request tracking.
- Target-scoped waiting and concurrency protection.
- Dispatching the canonical repository workflow.
- Observing workflow and runtime results.
- GitHub Deployment and Check Run updates.
- Operational UI state.
- Terminal events and callbacks to the initiating task.

### Repositories own

- Source composition rules.
- Build and package implementation.
- Environment-specific deployment implementation.
- Component health and deployed-version verification.
- Component-level rollback implementation where supported.

## 4. Agent-facing operation contract

Deploy Hub must provide machine-facing operations equivalent to:

```text
requestDeployment({
  requestId,
  repository,
  pullRequest,
  sourceSha,
  environment,
  services?,
  requestedBy,
  taskReference
})

getDeployment(requestId)
cancelDeployment(requestId)
retryDeployment(requestId)

requestValidation({
  validationId,
  environment,
  frontendRuntimeSha,
  backendRuntimeVersionsByService,
  linkedDeploymentRequestIds,
  testToolingSha,
  packPolicy,
  requestedBy,
  taskReference
})

getValidation(validationId)
cancelValidation(validationId)
retryValidation(validationId)
```

Requirements:

- `sourceSha` is an immutable 40-character commit SHA.
- Repeating the same `requestId` and identical payload returns the same logical
  operation.
- Reusing a request ID with a different payload is rejected.
- A moved PR head never silently changes an accepted operation.
- A waiting operation for an old head is marked stale by default.
- An operation remains queryable if the initiating agent becomes idle.
- Terminal events contain enough identity to resume the correct Codex task.
- Every state can be reconstructed from durable evidence after interruption.
- A validation binds immutable deployed identities, not mutable branch names.
- Repeating the same `validationId` and identical snapshot returns the same
  logical validation; conflicting reuse is rejected.
- A coordinated frontend/backend deployment uses one validation after every
  intended component is deployed and links that result to each request.

## 5. Canonical deployment adapters

### Frontend staging

- The deployment source is an exact commit incorporated into `1a-staging` using
  the repository-approved, non-force integration path.
- A push to `1a-staging` triggers `.github/workflows/deploy-staging.yml`.
- Deploy Hub observes and reports the canonical workflow; it does not replace
  the build or deployment implementation.

### Frontend production

- Production deploys an explicitly approved exact `main` SHA.
- Deploy Hub invokes `.github/workflows/build-upload-deploy-prod.yml`.
- The workflow verifies that the selected source is `main` and confirms the
  exact deployed version.

### Backend staging and production

- Deploy Hub invokes `.github/workflows/deploy.yml`.
- The operation specifies the exact source SHA, environment, and affected
  service or services.
- Unaffected services are not built or deployed merely because they share the
  backend repository.

## 6. Operation states

The MVP state model is limited to:

```text
accepted
waiting
dispatched
running
succeeded
failed
cancelled
stale
```

Workflow-level detail may be displayed from GitHub Actions without duplicating
every workflow step as Deploy Hub state.
Deployment and validation remain distinguishable within `running`: the UI and
Check Runs must show phases such as `deploying`, `deployed; validating`, and
`deployed; validation failed` without expanding the durable state machine.

## 7. Concurrency and waiting

- Frontend staging mutation capacity is one.
- Frontend production mutation capacity is one.
- Backend mutations are serialized only where services or infrastructure are
  incompatible with concurrent deployment.
- Frontend work does not globally block unrelated backend work.
- Builds and isolated CI may run independently.
- Shared integration validation has capacity one while it requires a stable
  complete environment.
- Staging and production validation locks are independent.
- An environment validation lock blocks mutation only to that same environment
  while its exact snapshot is verified and E2E runs.
- The validation lock does not block PR CI, non-mutating preparation, agent
  work, or the other environment.
- Waiting must be visible, durable, and attributable to a specific scoped
  blocker.

## 8. Testing and validation

- Deploy Hub does not rerun pull-request unit, lint, type, security, or review
  suites.
- Exact-head PR CI qualifies the source before deployment.
- Repository workflows perform build, deployment, health, and exact-version
  checks.
- Health and exact-version proof are required for every real deployment.
- Every requested staging outcome requires terminal successful baseline
  read-only E2E after all intended components are deployed.
- Every requested production outcome requires terminal successful
  production-safe read-only E2E.
- The initial mandatory baseline is all 12 current staging post-deploy packs and
  all 11 current production post-deploy packs. A partial diagnostic pack run
  cannot satisfy the baseline.
- E2E is bound to an exact environment snapshot containing the frontend runtime
  SHA and backend runtime versions by service. The snapshot is verified before
  and after testing.
- The E2E workflows and Playwright implementation remain owned by the frontend
  repository; Deploy Hub dispatches and observes them but does not copy their
  implementation.
- The Codex task selects targeted feature-specific staging validation by
  default.
- Deeper authenticated, mutating, feature-specific, or cross-system validation
  is required only by explicit policy or change risk.
- Validation failure affects the owning operation and does not stop unrelated
  targets unless the environment itself is unsafe.
- Product E2E failure does not auto-retry. Retryable workflow/setup
  infrastructure failure may retry the same validation identity within a
  bounded policy.

### Shadow integration branch

- Frontend shadow validation uses a long-lived `1a-deploy-hub` branch that
  mirrors the Git and integration behavior of `1a-staging` without targeting
  shared staging.
- Only explicitly allowlisted test PRs may be integrated into
  `1a-deploy-hub`.
- `1a-deploy-hub` triggers a dedicated credentialless shadow workflow, not
  `deploy-staging.yml`.
- The shadow workflow may resolve exact SHAs, integrate commits, build, project
  statuses, exercise idempotency, and simulate success, failure, cancellation,
  retry, and callback delivery.
- The shadow workflow must have no staging or production AWS credentials, no
  permission to update `1a-staging` or `main`, and no ability to dispatch a real
  deployment workflow.
- Initial shadowing must not publish Check Runs to colleagues' PRs. Check Run
  writes are limited to explicitly opted-in test PRs after projected payloads
  have been verified.
- Backend shadow validation may use the exact PR SHA directly because the
  canonical backend deploy workflow is dispatch-based; a backend integration
  branch is not required unless later evidence shows one is useful.
- Passing shadow validation does not prove AWS deployment, runtime health,
  rollback, or real shared-environment concurrency. Those require isolated
  execution infrastructure before a shared-staging canary.

## 9. Pull request feedback and live updates

Every request creates or updates one Check Run for its exact SHA and target.

The Check Run must expose:

- Target environment.
- Repository, PR, and exact source SHA.
- Affected backend services where applicable.
- Current operation state and scoped blocking reason.
- Request ID and originating task identity.
- Links to Deploy Hub and the canonical workflow run.
- Baseline validation identity, environment snapshot, E2E phase, and E2E run.
- Stale-head status.
- Terminal conclusion and concise failure information.

The operational UI must update without a browser refresh when:

- A deployment operation is created.
- An operation changes state or reaches a terminal result.
- Queue order or a scoped blocker changes.
- A deployed environment version changes.
- Shared integration-validation ownership changes.

The browser first loads an authoritative snapshot, then consumes a live event
channel. It must reconnect automatically and resynchronize from a fresh
snapshot after any interruption. Under normal operation, accepted or observed
changes appear within two seconds. A fallback polling path must preserve
automatic updates at least every five seconds if the live channel is
temporarily unavailable.

PR Check Runs update from the same operation transitions. Developers must not
need to monitor Actions logs to understand progress.

## 10. Operational UI

### Delivery

- Static UI files are owned by this repository on `deploy-hub/main`.
- The existing backend exposes the UI at `/deploy/ui/hub` through an
  authenticated proxy; UI source and build output are not copied into the
  backend repository.
- The proxy resolves `deploy-hub/main` to an exact commit SHA and serves all
  files for one page load from that SHA so releases cannot mix assets.
- UI releases become available after merging to `deploy-hub/main` without a
  backend deployment.
- The proxy caches immutable commit-addressed files and switches to a new
  resolved `main` release atomically.
- The UI displays the exact `deploy-hub` commit SHA it is running.
- The private-repository credential remains server-side and has read access
  only to the UI content it needs.

### Operational data

The UI must show:

- Current frontend and backend versions by environment.
- Active and waiting deployment operations.
- The exact scoped lock or blocker for each waiting request.
- PR, SHA, requester, and originating Codex task.
- Workflow links and elapsed time.
- Deployment history and terminal outcomes.
- Retry and cancel controls subject to authorization.
- Shared integration-validation ownership.
- Validation phase, exact environment snapshot, pack policy, elapsed time, and
  rolling estimated completion time.

The UI must not expose release trains or a single opaque global lane.
Static files from GitHub never serve as operational state; the authenticated
Deploy Hub API supplies snapshots, live events, history, and commands.

## 11. Failure and recovery

- Infrastructure failures may retry the same logical request within a bounded
  policy.
- Duplicate dispatch or callback delivery must not create a second logical
  deployment.
- Missed callbacks are recovered by reading authoritative GitHub state.
- A deployment that cannot prove its exact runtime version does not succeed.
- Stale SHAs fail closed.
- One failed operation does not pause unrelated environments or repositories.
- Failed component deployment wakes the owning agent with structured evidence.
- A staging E2E failure is reported as `deployed but validation failed` and
  prevents that exact result from progressing to production.
- A production E2E failure is reported as `deployed but validation failed` and
  blocks later production mutation until exact reconciliation, explicit
  acceptance, or known-good exact redeployment.
- A known-good exact version can be redeployed explicitly through the
  repository-owned canonical workflow.
- Automatic cross-repository rollback is not part of the MVP.

## 12. Security and audit

- Human and agent callers are authenticated and attributable.
- An organization-owned GitHub App is the control-plane identity.
- Shadow begins with a physically read-only installation. Repository writes,
  workflow dispatch, Check Run writes, and environment authority are granted
  separately and only when the corresponding rollout phase requires them.
- Production authority is explicit and bound to the initiating request.
- Repository and environment permissions use least privilege.
- AWS access uses GitHub Actions OIDC where practical.
- Every request records requester, task reference, PR, exact SHA, target,
  workflow run, deployed version, timestamps, and terminal result.
- Secret values never enter request records, Check Runs, or UI payloads.

## 13. MVP

The MVP includes:

- Frontend staging and production adapters.
- Backend staging and production adapters.
- Exact-SHA validation and deployed-version proof.
- Exact environment-snapshot validation records.
- Mandatory staging and production baseline read-only E2E adapters.
- Idempotent request/status/cancel/retry operations.
- Minimal durable request tracking.
- GitHub-native durable evidence without an MVP database or S3 request ledger.
- Scoped concurrency.
- GitHub Deployments and Check Runs.
- Terminal events for Codex tasks.
- Operational UI and history.
- GitHub-backed static UI delivery and automatic live state updates.
- Manual canonical workflows as break-glass fallback.

## 14. Later capabilities

- Convenience release plans linking multiple independent operations.
- Automated component rollback where repo-owned primitives are proven safe.
- Preview environments for truly concurrent isolated integration testing.
- Rich deployment policy profiles.
- Advanced historical analytics.

## 15. Non-goals

- Autonomous discovery or claiming of ready pull requests.
- Time-based batching of unrelated changes.
- Release trains.
- A duplicated PR CI system.
- Deploy Hub-owned build or cloud deployment implementation.
- Deploy Hub-owned Playwright or duplicated E2E implementation.
- A complete mirror of GitHub workflow state in a database.
- A continuously running reconciler unless later evidence proves it necessary.
- Automatic cross-repository rollback or transaction semantics.
- Release note generation.

## 16. Remaining verification

See `../STATUS.md` for implementation facts that still require verification.
Accepted architecture choices are recorded in `decisions/`.
