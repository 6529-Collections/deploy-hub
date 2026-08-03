# Deploy Hub Architecture

Status: Agreed v1.0
Last updated: 2026-08-03

## Core boundary

The Codex task is the feature-lifecycle orchestrator. Deploy Hub accepts and
finishes one exact deployment or environment-snapshot validation operation.
Repository workflows execute builds, deployments, and baseline E2E. GitHub and
runtime version endpoints provide authoritative execution evidence. Existing
repository notifiers and backend services continue to own deployment drops and
production release notes.

The canonical source for the following diagram is
`diagrams/target-architecture.mmd`.

```mermaid
flowchart LR
    U["Developer"] --> A["Codex task<br/>Feature lifecycle orchestrator"]
    U --> UI["Deploy Hub browser UI"]

    subgraph H["Deploy Hub — control and visibility"]
        API["Agent-facing deployment API"]
        L["GitHub-native request evidence<br/>and scoped locks"]
        P["Authenticated static-file proxy"]
    end

    subgraph G["GitHub and repositories"]
        UIS["deploy-hub/main<br/>static UI files"]
        PR["PR Check Runs<br/>and Deployments"]
        FE["Frontend canonical workflows"]
        BE["Backend canonical workflow"]
        V["Frontend-owned<br/>E2E workflows"]
    end

    subgraph C["Existing deployment communications"]
        N["Backend CI-alert receiver"]
        R["Release-note queue<br/>and generator"]
        D["CI and release-note drops"]
    end

    subgraph E["Runtime environments"]
        STG["Staging"]
        PROD["Production"]
    end

    A -->|"Exact deployment or validation operation"| API
    UI -->|"Snapshots and commands"| API
    API -->|"Live state events<br/>plus reconnect and resync"| UI
    UIS -->|"Files from one resolved SHA"| P
    P -->|"Serve /deploy/ui/hub"| UI
    API --> L
    API --> FE
    API --> BE
    API --> V

    FE --> STG
    FE --> PROD
    BE --> STG
    BE --> PROD
    V -. "Snapshot-bound read-only tests" .-> STG
    V -. "Snapshot-bound read-only tests" .-> PROD

    FE -->|"Exact deployment evidence"| N
    BE -->|"Exact deployment evidence"| N
    N -->|"CI deployment drop"| D
    N -->|"Production-only async request"| R
    R -->|"Release-note drop"| D
    N -->|"Notification outcomes"| API
    R -->|"Publication outcomes"| API

    FE -->|"Workflow events"| PR
    BE -->|"Workflow events"| PR
    V -->|"Validation events"| PR
    PR --> API
    PR -->|"Resume or notify"| A
```

## Agent-owned production sequence

The canonical source for this diagram is
`diagrams/agent-to-production-sequence.mmd`.

```mermaid
sequenceDiagram
    actor D as Developer
    participant A as Codex task
    participant G as GitHub PR
    participant H as Deploy Hub
    participant W as Repository workflow
    participant E as Environment
    participant V as Frontend E2E workflow
    participant C as Existing communications pipeline

    D->>A: Work on this and see it through to prod
    A->>G: Implement and open or update PR
    G-->>A: Exact-head CI and review result
    A->>H: Deploy exact PR SHA to staging
    H->>G: Create or update staging Check Run
    H->>W: Start canonical staging path
    W->>E: Deploy and health-check
    W->>C: Post exact staging deployment evidence
    C-->>W: CI-drop outcome; release note ineligible
    W-->>H: Deployed with exact runtime identity
    H->>E: Capture exact staging snapshot
    H->>V: Run mandatory staging baseline E2E
    V->>E: Execute read-only packs
    V-->>H: Terminal snapshot-bound result
    H->>E: Verify staging snapshot is unchanged
    H->>G: Conclude staging Check Run
    H-->>A: Staging deployed and validated
    A->>E: Run additional feature validation when required
    A->>G: Merge exact approved result
    A->>H: Deploy exact main SHA to production
    H->>W: Start canonical production path
    W->>E: Deploy and verify version
    W->>C: Post exact production deployment evidence
    C-->>W: CI-drop and release-note enqueue outcomes
    Note over H,C: Release-note publication is observable but does not gate the environment
    W-->>H: Deployed with exact runtime identity
    H->>E: Capture exact production snapshot
    H->>V: Run mandatory production-safe E2E
    V->>E: Execute read-only packs
    V-->>H: Terminal snapshot-bound result
    H->>E: Verify production snapshot is unchanged
    H->>G: Conclude production Check Run
    H-->>A: Production deployed and validated
    A-->>D: Feature is verified in production
    opt Later asynchronous communication outcome
        C-->>H: Release note published, skipped, or failed
        H-->>A: Non-gating communication event
    end
```

## State ownership

### Authoritative state

- Deploy Hub request, command, claim, event, and terminal truth: the protected
  `refs/heads/state/v1` Git ledger in the private Deploy Hub repository.
- Pull-request identity and head SHA: GitHub Pull Requests.
- CI and review readiness: GitHub checks and reviews.
- Deployment execution: canonical GitHub Actions workflow run.
- Baseline validation execution and evidence: frontend-owned GitHub Actions E2E
  workflow run bound to an exact environment snapshot.
- Deployment projection and recent status history: GitHub Deployment and
  Deployment Status records. The Git ledger remains authoritative because old
  status history has limited retention.
- PR-visible progress: GitHub Check Run.
- Actual deployed identity: environment-specific runtime version endpoint or
  infrastructure version identifier.
- Deployment-drop and release-note truth: the existing backend CI-alert
  receiver, release-note queue/generator, deduplication evidence, and published
  drops.

### Minimal Deploy Hub state

Deploy Hub may persist only what cannot be derived reliably:

- Request ID and immutable payload.
- Requester and originating task reference.
- Waiting order when a target is busy.
- Idempotency evidence.
- Cancellation intent not yet reflected in a workflow.
- Validation ID, immutable environment snapshot, pack policy, and links to the
  linked deployment and E2E runs.
- Communication identity and links to the exact notification, queue/generator
  outcome, and published drop when available.

The MVP stores these records as immutable requests and append-only event files
on one protected `refs/heads/state/v1` branch. Each event and derived snapshot
is committed with a non-force compare-and-swap update. GitHub Deployments,
Check Runs, workflow runs, runtime proof, and communication evidence are linked
projections and external truth. See `docs/contracts/README.md` and ADR 0006.
No database or S3 request ledger is added; a database-backed release state
machine remains explicitly excluded.

## UI delivery and live state

The UI has two deliberately separate paths:

```text
static code: browser → backend proxy → deploy-hub/main at one exact SHA
live data:   browser ↔ authenticated Deploy Hub API → GitHub/runtime truth
```

The backend authenticates `/deploy/ui/hub`, resolves `deploy-hub/main` to an
exact commit, and proxies cached HTML, CSS, and JavaScript from that commit. It
never exposes its private-repository credential to the browser and never mixes
assets from different commits. A merge to `deploy-hub/main` publishes a UI
release without coupling it to a backend repository deployment.

After loading an authoritative snapshot, the browser obtains a single-use,
short-lived WebSocket ticket over authenticated HTTP and subscribes through the
existing backend WebSocket runtime. State transitions, new requests, queue
changes, blockers, validation ownership, and deployed-version changes are
emitted as ordered, authorization-filtered summaries. CI-drop and release-note
milestones use the same live path without becoming deployment-state
transitions. HTTP remains authoritative for snapshots and commands. On a gap,
disconnect, role change, or server restart, the browser obtains a fresh
snapshot before applying more events. Authenticated polling at no more than
five-second intervals is the fallback, so transport failure never makes manual
browser refresh part of normal operation.

## Authentication and permissions

The existing wallet-authenticated 6529 profile is human authority. Codex uses
OAuth 2.1 authorization-code with PKCE through an authenticated Streamable HTTP
MCP surface; its task ID is correlation, not authority. The browser uses a
short-lived `HttpOnly` session plus CSRF protection and never holds a GitHub
token.

An organization-owned GitHub App is the visible control-plane executor. Its
private key remains inside a server-side token broker, which mints one
repository- and operation-scoped installation token at a time. The first App
registration and installation are physically read-only. Contents, Check Run,
workflow-dispatch, repository-mutation, deployment, and AWS authority are
separate capabilities introduced only when the rollout phase needs each one.
Canonical workflows authenticate callbacks and AWS role assumption with
short-lived GitHub OIDC tokens rather than shared deployment secrets.

The normative scopes, phase permission matrix, repository protections, secret
inventory, and threat review are in `security-model.md` and ADR 0007. The
standalone trust-boundary diagram is
`diagrams/security-trust-boundaries.mmd`.

## Deployment adapter mapping

| Component | Environment | Canonical entry point |
| --- | --- | --- |
| Frontend | Staging | Non-force integration into `1a-staging`, triggering `deploy-staging.yml` |
| Frontend | Production | `build-upload-deploy-prod.yml` from exact `main` |
| Backend | Staging | `deploy.yml` with exact SHA and one selected service per atomic request |
| Backend | Production | `deploy.yml` with exact `main` SHA and one selected service per atomic request |

## Deployment communications and release notes

Deploy Hub reuses the repository-owned pipeline analyzed in
`deployment-communications-analysis.md` and accepted in ADR 0005:

```text
canonical workflow
→ exact request, run, SHA, environment, PR, and service evidence
→ existing backend CI-alert receiver
→ CI deployment drop
→ production-only asynchronous release-note queue/generator
→ published, skipped, deduplicated, or failed release-note outcome
```

The Hub contributes immutable request identity, requester/task attribution, and
its authenticated GitHub App authority. Repository workflows retain contributor
evidence collection because the correct scope depends on repository-specific
PR, commit-range, and backend-service facts. The backend retains rendering,
profile mapping, release-note comparison, queueing, deduplication, and
publication.

Deployment authority, requester, and contributors are separate. `Deploy Hub`
is a distinct authenticated initiator classification; it is neither `Release
Train` nor the requesting human. Contributor evidence failure omits the
contributor row with a diagnostic instead of guessing or preventing the CI
drop.

Communication outcomes are linked side effects, not deployment state-machine
terminals. The UI, Check Run, audit history, and task event distinguish CI-drop
acceptance from release-note eligibility, enqueueing, skipping,
already-published, publication, and failure. A failure produces a visible
warning and recovery path but does not hold an environment lock or override
health, exact-version, and mandatory E2E truth.

## Environment-snapshot E2E

Deploy Hub creates one validation record only after every component intended
for the outcome is deployed. The record binds the environment, frontend
runtime SHA, backend runtime version per service, linked deployment request
IDs, E2E tooling SHA, and full baseline pack policy. A coordinated frontend and
backend outcome shares one record rather than running duplicate suites.

The frontend repository continues to own the Playwright implementation and E2E
workflows. Deploy Hub dispatches and observes all 12 current staging
post-deploy packs or all 11 current production-safe packs, verifies the exact
environment snapshot immediately before and after the run, and exposes the
result through the linked Check Runs, task event, and UI. Additional
feature-specific, authenticated, mutating, or deeper cross-system validation is
selected by the Codex task or policy and is not part of the universal baseline.

A product-test failure is terminal until an explicit retry or corrective
deployment. A retryable workflow or setup failure may receive a bounded retry
under the same validation identity. Staging validation failure blocks that
result from production. Production validation failure blocks later production
mutation until reconciliation, explicit acceptance, or exact known-good
redeployment.

## Shadow validation topology

Frontend control-plane validation uses `1a-deploy-hub` as a non-production
integration branch that mirrors how exact PR changes are incorporated into
`1a-staging` without invoking the real staging workflow.

```text
explicitly allowlisted frontend PR
→ integrate exact head into 1a-deploy-hub
→ credentialless deploy-hub-shadow workflow
→ build and simulate operation states
→ project UI, Check Run, idempotency, and callback behavior
```

The shadow workflow has no staging or production AWS credentials, cannot update
`1a-staging` or `main`, and cannot dispatch canonical deployment workflows.
Initial shadow results remain inside Deploy Hub; Check Runs are written only to
explicitly opted-in test PRs after their projected payloads are verified.

Backend shadow validation normally dispatches a credentialless simulation for
the exact PR SHA and selected services. It does not require an integration
branch because the canonical backend operation is already exact-SHA and
dispatch-based.

This topology validates Git composition, request identity, waiting,
idempotency, state projection, failures, retries, cancellations, and agent
callbacks. It cannot validate AWS mutation, runtime health, rollback, or actual
shared-environment concurrency; those remain isolated-environment and canary
tests.

## Concurrency model

Concurrency is attached to actual mutation resources, not to a global release
train. Staging and production each receive a separate short-lived validation
lock while an exact snapshot is verified and baseline E2E runs. That lock
blocks mutation only to the same environment; it does not block the other
environment, PR CI, non-mutating preparation, or unrelated agent work.

## Multi-repository features

A coordinated feature is a plan held by the Codex task containing multiple
independent deployment operations and explicit ordering. Deploy Hub may display
and link them, but it does not convert them into an immutable global train.

Example:

```text
backend staging operation
→ backend health check
→ frontend staging operation
→ frontend health check
→ one mandatory E2E validation of the resulting staging snapshot
→ additional feature validation when required
```

## Recovery model

Deploy Hub reconstructs operation results from GitHub and runtime truth after an
interruption. It does not assume that a callback is the only evidence of
completion. Retry preserves the same logical request identity and never silently
substitutes a newer mutable branch head.

For MVP rollback, the owning agent or operator selects a known-good exact
version and invokes the repository-owned canonical workflow. Automatic
component rollback remains later work until those repository primitives are
proven safe.
