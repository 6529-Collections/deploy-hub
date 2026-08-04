# Deploy Hub Requirements

Status: Agreed v1.2

Last updated: 2026-08-03

## 1. Product definition

Deploy Hub is a portable static deployment and observability app. Humans use
the page and Codex uses its existing GitHub tooling. Both operate the same
allowlisted canonical GitHub workflows and read the same GitHub/runtime
evidence.

Rule 1 is KISS: all Deploy Hub implementation lives in this repository. Do not
add a backend, API proxy, Lambda, database, Git ledger, queue, scheduler,
reconciler, callback system, or live transport unless a demonstrated failure
proves that the static app plus GitHub cannot meet a requirement.

## 2. Required developer outcomes

These instructions must work without the developer manually watching workflow
pages:

- `Get this to staging.`
- `Work on this change and see it through to production.`
- `Deploy this frontend and backend change together.`
- `Cancel this deployment.`
- `Retry the failed deployment.`
- `Show what is deployed and what is waiting.`

The initiating Codex task continues until the requested outcome succeeds or a
real blocker requires user input.

## 3. Ownership

### Codex task

- Implements the feature and owns its branches and pull requests.
- Handles CI, reviews, exact-head readiness, and explicit main-merge authority.
- Uses its existing GitHub authentication directly.
- Chooses feature-specific validation beyond the baseline.

### Deploy Hub static app

- Authenticates the user's GitHub token directly with GitHub.
- Allows only fixed repositories, workflows, refs, environments, and service
  inputs.
- Dispatches or observes canonical repository workflows through GitHub.
- Uses the GitHub workflow run ID and URL as operation identity.
- Shows GitHub waiting, progress, validation, runtime proof, cancellation,
  retry, and recent history without manual browser refresh.

### Existing repositories and systems

- Frontend and backend repositories own builds, deployments, CI notifications,
  production release notes, and runtime proof.
- GitHub Actions owns conflicting-work concurrency and workflow state.
- Existing backend services remain ordinary deployment targets and
  communication infrastructure; they do not host a Deploy Hub API.

## 4. Authentication

- The page accepts the same GitHub token the operator already uses.
- The token is stored only in that page origin's `localStorage` and can be
  forgotten visibly.
- The browser sends the token directly to `https://api.github.com`.
- GitHub `/user` supplies identity; active organization-admin or existing
  deployment-operator team membership supplies operator access.
- The token and Authorization header never appear in URLs, UI text, logs,
  errors, fixtures, workflow inputs, or durable state.
- The page uses no third-party scripts and ships a restrictive CSP.
- Codex uses its existing GitHub authentication; it needs no Deploy Hub token,
  OAuth flow, or shared service credential.

## 5. GitHub operation contract

The app and agent use fixed GitHub API operations, not a Deploy Hub HTTP API:

- immutable 40-character source SHA;
- explicit staging or production intent;
- allowlisted repository, canonical workflow/ref, environment, and backend
  service set;
- exact workflow run ID/URL returned or discovered after dispatch;
- lookup, cancellation, and retry by exact run and exact SHA;
- final state derived from GitHub workflow/check and repository-owned runtime
  evidence.

Before mutation, recheck current operator permission, source SHA, target, and
the exact allowlisted action. Production is always a separate explicit action.
No caller-supplied login, workflow file, arbitrary repository/ref, callback
URL, contributor identity, or AWS target is accepted.

The static page is not an authorization boundary: its checks prevent mistakes
but its JavaScript can be bypassed. GitHub repository permissions and the
canonical workflow/ref/environment protections must enforce every real
mutation and reject unauthorized direct dispatches.

Duplicate requests first search for the same exact correlated run and rely on
canonical workflow concurrency as the final mutation guard. Add stronger
durable idempotency only after a reproduced duplicate mutation proves it is
needed.

## 6. Canonical deployment paths

### Frontend staging

- Integrate the exact source into `1a-staging` through the approved non-force
  path.
- The push triggers `.github/workflows/deploy-staging.yml`.
- Do not duplicate its build or deployment logic.

### Frontend production

- Require explicit production authority and exact current `main` SHA.
- Use `.github/workflows/build-upload-deploy-prod.yml`.
- Recheck `main` and runtime identity at the mutation boundary.

### Backend staging and production

- Use `.github/workflows/deploy.yml` with exact SHA, environment, and an
  allowlisted affected-service set.
- Do not build or deploy unrelated services.

Canonical manual workflows remain the fallback throughout rollout.

## 7. Concurrency and waiting

- Frontend and unrelated backend work must not be globally serialized.
- Staging and production remain independent.
- Canonical GitHub Actions concurrency groups own conflicting mutation order.
- Deploy Hub shows GitHub's queued/in-progress state and waiting reason.
- Deploy Hub has no lock table, lease, heartbeat, queue, scheduler, or
  continuously running reconciler.
- E2E records the environment snapshot before and after. Snapshot drift yields
  `stale` and a rerun rather than a cross-repository lock.

## 8. Baseline E2E

Every requested staging or production outcome includes one baseline read-only
environment-snapshot E2E phase after intended components are deployed.

- Staging requires all 12 accepted baseline packs.
- Production requires all 11 production-safe packs.
- Frontend-only, backend-only, and coordinated changes are supported.
- A coordinated change uses one suite after all intended components deploy.
- Exact frontend SHA and backend service versions are checked before and after.
- Product failure, infrastructure failure, and snapshot drift remain distinct.
- E2E state is the linked canonical workflow run, not another state machine.

Recent evidence suggests roughly seven minutes for staging and four minutes
for production. Show elapsed time; rolling ETA analytics are not MVP work.

## 9. UI, hosting, and updates

- UI source lives in `deploy-hub/main` as plain static files.
- The app works from any ordinary static host. Hosting through `api.6529.io` is
  optional and supplies files only; it is not an authentication or runtime
  dependency.
- The page displays its source version.
- After authentication, the page polls GitHub directly at least every five
  seconds for relevant workflow changes.
- The next complete read repairs missed polls without cursors or replay.
- Show environment identities, recent operations, GitHub waiting state, exact
  SHA/services, requester/task/PR, phase, elapsed time, blockers, workflow/E2E
  links, cancellation, retry, and communication links when available.
- No SSE, WebSocket, client event ledger, or custom snapshot service is MVP.

## 10. PR feedback and communications

- Use the canonical workflow check first.
- Add at most one commit status only if the existing check is insufficient.
- Consider a narrow GitHub App Check Run only after both simpler surfaces are
  proven insufficient.
- Canonical workflows and existing systems remain authoritative for CI drops
  and production release notes.
- Deploy Hub links their available outcomes and does not mirror their queues,
  state, content generation, deduplication, or publication.
- Communication failure is visible but never changes healthy deployment/E2E
  truth.

## 11. Testing and migration

Rollout order:

1. Browser-unit tests and deterministic GitHub-response fakes.
2. One opt-in credentialless shadow workflow using exact test SHAs.
3. Use `1a-deploy-hub` only if branch-trigger behavior must be tested.
4. Controlled low-risk shared-staging canaries while manual workflows remain
   available.
5. Shared-staging burn-in, then explicitly authorized low-risk production
   pilots.
6. Establish Deploy Hub, then remove dormant Release Bus as technical debt.

Shadow mode must be physically unable to update protected refs, assume AWS
roles, dispatch real deploys, or publish real communications. Shadow results
are never deployment evidence.

## 12. Failure and recovery

- Always report GitHub workflow and current runtime truth, including partial
  mutation.
- Retry the same exact SHA/target; never silently follow a branch.
- A page reload reconstructs state from GitHub; no server replay or
  reconciliation process exists.
- Known-good exact redeployment through the canonical workflow is the MVP
  rollback path.
- Direct canonical workflow execution remains the break-glass fallback.

## 13. Agent-facing operation

- Deploy Hub provides one small documented command or skill in this repository
  for Codex to plan, dispatch, inspect, cancel, and retry exact operations.
- It uses Codex's existing GitHub authentication and the same fixed GitHub
  operation contract as the page.
- It does not require browser state, token transfer, a Deploy Hub service, or a
  second deployment implementation.
- The initiating task retains the exact run ID/URL and continues until terminal
  success or a real blocker.

## 14. Explicit MVP exclusions

- Any Deploy Hub backend, API proxy, Lambda, container, database, S3/Git
  ledger, state branch, event journal, snapshot store, custom queue, scheduler,
  locks, leases, or reconciler.
- OAuth server, PKCE, wallet role mapping, refresh-token store, GitHub App token
  broker, callback identity system, SSE, or WebSockets.
- A separate validation state machine or release-note mirror.
- GitHub Deployments or a GitHub App unless a concrete gap proves necessary.
- Automatic rollback or Release Bus-style train/composition ownership.
- Mandatory isolated cloud infrastructure or a permanent `1a-deploy-hub`
  branch.
