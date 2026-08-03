# Deploy Hub Requirements

Status: Agreed v1.1
Last updated: 2026-08-03

## 1. Product definition

Deploy Hub is a small agent-facing deployment and observability layer. It
accepts an exact deployment request, invokes the repository's existing
deployment path, reports current GitHub/runtime truth to the PR and UI, runs
the required baseline E2E phase, and returns a terminal result.

The initiating Codex task owns the broader feature lifecycle. Frontend and
backend repositories continue to own builds, deployments, CI notifications,
and production release notes.

Rule 1 is KISS: use the existing backend, GitHub Actions, canonical workflows,
and runtime evidence. Do not add a service, database, Git branch ledger, queue,
scheduler, reconciler, callback system, or live transport unless a reproduced
problem proves that those primitives cannot meet a requirement.

## 2. Required developer outcomes

These instructions must work without the developer manually watching workflow
pages:

- `Get this to staging.`
- `Work on this change and see it through to production.`
- `Deploy this frontend and backend change together.`
- `Cancel this deployment.`
- `Retry the failed deployment.`
- `Show what is deployed and what is waiting.`

The initiating task continues until the requested outcome succeeds or a real
blocker requires user input.

## 3. Ownership

### Codex task

- Implements the feature and owns its branches and PRs.
- Handles CI, reviews, exact-head readiness, and explicit main-merge authority.
- Chooses feature-specific validation beyond the baseline.
- Decides how to respond to failures.

### Deploy Hub

- Authenticates and authorizes an exact deployment request.
- Dispatches or observes the canonical repository workflow.
- Returns the GitHub workflow run ID and URL as the operation identity.
- Derives current state from GitHub workflow/check and runtime evidence.
- Dispatches and observes the baseline E2E phase.
- Supplies PR feedback and an automatically refreshing UI.
- Supports exact-run lookup, cancellation, and retry.

### Repositories and existing backend

- Own source composition, build, package, and environment mutation.
- Own health and deployed-version proof.
- Own GitHub Actions concurrency for conflicting work.
- Own CI deployment drops and production release-note automation.
- The existing 6529 backend owns the small Deploy Hub HTTP boundary and static
  UI proxy.

## 4. Agent-facing HTTP API

The existing backend exposes the smallest useful surface:

```text
POST /deploy/hub/staging
POST /deploy/hub/production
GET  /deploy/hub/operations/:operationId
POST /deploy/hub/operations/:operationId/cancel
POST /deploy/hub/operations/:operationId/retry
POST /deploy/hub/validations
GET  /deploy/hub/snapshot
```

Requirements:

- Humans and Codex use the same GitHub Bearer token already used by the current
  deploy UIs.
- The backend resolves the GitHub login and current repository/operator access;
  a task ID is correlation only.
- Staging and production are separate explicit actions.
- Source is an immutable 40-character commit SHA. A moved PR head never changes
  an accepted operation.
- Mutation responses return the exact GitHub workflow run ID/URL.
- Before dispatch, the backend looks for the same exact operation/run. Canonical
  workflow concurrency is the final duplicate-mutation guard.
- If real testing demonstrates that this is insufficient, add the smallest
  durable idempotency record for that failure—never a speculative event system.
- Retry preserves exact SHA and target and links a new run to the prior run.
- Cancellation maps to GitHub workflow cancellation where possible.
- No caller-supplied login, contributor identity, callback URL, workflow file,
  repository, service, or environment outside server allowlists is accepted.

The operation states shown by API/UI are derived, not stored as a second state
machine:

```text
queued -> running -> succeeded | failed | cancelled
```

Deploying and validating are display phases based on the linked workflow runs.
Stale means the requested/runtime identity no longer matches the required exact
identity.

## 5. Canonical deployment paths

### Frontend staging

- Integrate the exact source into `1a-staging` through the approved non-force
  path.
- The push triggers `.github/workflows/deploy-staging.yml`.
- Do not create a duplicate manual dispatch or duplicate build/deploy logic.

### Frontend production

- Require explicit production authority and an exact current `main` SHA.
- Use `.github/workflows/build-upload-deploy-prod.yml`.
- Recheck `main` and runtime identity at the mutation boundary.

### Backend staging and production

- Use `.github/workflows/deploy.yml` with exact SHA, environment, and an
  allowlisted affected-service set.
- Do not build or deploy unrelated services.
- Preserve only the ordering constraints that real service dependencies need.

Canonical manual workflows remain the fallback throughout rollout.

## 6. Concurrency and waiting

- Frontend and unrelated backend work must not be globally serialized.
- Staging and production remain independent.
- Canonical GitHub Actions concurrency groups own conflicting mutation order.
- Deploy Hub shows GitHub's queued/in-progress state and concurrency reason.
- Deploy Hub has no lock table, lease, heartbeat, queue, scheduler, or
  continuously running reconciler.
- Environment-snapshot E2E verifies identity before and after its run. If the
  snapshot changes, the result is stale and is rerun; Deploy Hub does not hold
  a long cross-repository environment lock that blocks colleagues.

## 7. Baseline E2E

Every requested staging or production outcome includes one baseline read-only
environment-snapshot E2E phase after the intended components are deployed.

- Staging requires all 12 accepted baseline packs.
- Production requires all 11 production-safe packs.
- Frontend-only, backend-only, and coordinated changes are supported.
- A coordinated change uses one suite after all intended components deploy.
- Exact frontend SHA and backend service versions are checked before and after.
- A changed snapshot yields `stale`, not a misleading product failure.
- Product failure and infrastructure failure have different retry guidance.
- Deeper feature-specific/cross-system validation remains risk-based.
- E2E state is the linked canonical workflow run, not a separate durable
  validation state machine.

Recent evidence suggests roughly seven minutes for staging baseline E2E and
four minutes for production. The UI may show that static guidance and elapsed
time; rolling ETA/metrics are not an MVP requirement.

## 8. PR feedback and operation lookup

- Use the canonical workflow check first.
- Add one commit status only if the existing check does not provide adequate
  target, phase, blocker, validation conclusion, and links.
- Add a narrow GitHub App Check Run only if both simpler surfaces are proven
  insufficient.
- GitHub Deployments are not required by Deploy Hub MVP.
- The initiating task polls by operation/run ID. No task callback or event bus
  is required.
- A moved PR head is visibly stale without rewriting the accepted SHA.

## 9. UI

- UI source lives in `deploy-hub/main`.
- The existing backend proxy resolves one exact deploy-hub commit and serves a
  secret-free static shell and commit-addressed assets.
- `/deploy/ui/hub` remains available even if operational APIs are temporarily
  unhealthy; UI failure never disables canonical deployments.
- Operational calls use GitHub Bearer authentication.
- The open UI polls one authenticated snapshot endpoint at least every five
  seconds; no manual refresh is required.
- The next complete snapshot repairs missed/failed polls. Conditional requests
  keep unchanged polling cheap.
- No client event ledger, cursor protocol, SSE, or WebSocket is part of MVP.
- Show environment identities, recent operations, GitHub waiting state, exact
  SHA/services, requester/task/PR, phase, elapsed time, blockers, workflow/E2E
  links, cancellation, retry, and communication links when available.

## 10. Deployment communications

- Canonical workflows and the existing backend remain authoritative for CI
  deployment drops and production release notes.
- Deploy Hub provides exact request/authority context and displays the outcome
  or link exposed by that existing path.
- Requester, authenticated GitHub authority, operation contributors, and
  per-PR release-note contributors remain separate identities.
- Staging never requests a production release note.
- Communication failure is visible but never changes healthy deployment/E2E
  truth or holds deployment capacity.
- Deploy Hub does not mirror the release-note queue, add a communication
  ledger, or reimplement deduplication/publication state.

## 11. Security

- Use existing GitHub Bearer-token authentication and operator policy.
- The browser never receives the backend's private-repository fetch credential.
- Tokens, authorization headers, AWS details, and secrets never appear in UI
  snapshots, PR feedback, logs, fixtures, or communication payloads.
- Canonical workflows retain their existing GitHub/AWS trust boundaries.
- Explicit production intent and a final exact-SHA authorization check are
  mandatory immediately before production mutation.
- No OAuth server, PKCE, wallet role mapping, refresh-token store, GitHub App
  broker, workflow callback identity, or WebSocket ticket system is approved.

## 12. Testing and migration

Rollout order:

1. Credentialless unit tests and deterministic fakes.
2. One opt-in, credentialless shadow workflow using exact test SHAs.
3. Use `1a-deploy-hub` only if branch-trigger behavior must be tested; it is not
   a second staging lane.
4. Controlled low-risk shared-staging canaries during an announced clear
   window while manual workflows remain available.
5. Build a separate isolated cloud environment only if a specific unsafe
   behavior cannot be tested with fakes, shadowing, dry runs, or those canaries.
6. Shared-staging burn-in, then explicitly authorized low-risk production
   pilots.
7. Establish Deploy Hub, then remove dormant Release Bus as tracked technical
   debt.

Shadow mode must be physically unable to update `1a-staging`/`main`, assume AWS
roles, dispatch real deploys, or publish real CI/release-note drops. Shadow
results are never presented as deployment evidence.

## 13. Failure and recovery

- Always report GitHub workflow and current runtime truth, including partial
  mutation.
- Retry the same exact SHA/target; never silently follow a branch.
- Server restart needs no replay/reconciliation process—the next request polls
  GitHub/runtime state again.
- Known-good exact redeployment through the canonical workflow is the MVP
  rollback path.
- Do not add automatic cross-repository rollback.
- Direct canonical workflow execution remains the break-glass fallback.

## 14. Explicit MVP exclusions

- Deploy Hub database, S3 ledger, Git `state/v1` branch, event journal, snapshot
  store, custom queue, scheduler, locks, leases, or reconciler.
- A second Deploy Hub backend/Lambda/container.
- A separate validation state machine.
- Mandatory callbacks, webhook/event delivery, SSE, or WebSockets.
- GitHub Deployments or a GitHub App unless a concrete gap proves necessary.
- Mirrored CI-drop/release-note state or an analytics/ETA subsystem.
- Automatic rollback or Release Bus-style train/composition ownership.
- A permanent `1a-deploy-hub` branch or isolated cloud environment unless
  testing demonstrates a concrete need.
