# Deploy Hub Architecture

Status: Agreed v1.0
Last updated: 2026-08-03

## Core boundary

The Codex task is the feature-lifecycle orchestrator. Deploy Hub accepts and
finishes one exact deployment or environment-snapshot validation operation.
Repository workflows execute builds, deployments, and baseline E2E. GitHub and
runtime version endpoints provide authoritative execution evidence.

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

    D->>A: Work on this and see it through to prod
    A->>G: Implement and open or update PR
    G-->>A: Exact-head CI and review result
    A->>H: Deploy exact PR SHA to staging
    H->>G: Create or update staging Check Run
    H->>W: Start canonical staging path
    W->>E: Deploy and health-check
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
    W-->>H: Deployed with exact runtime identity
    H->>E: Capture exact production snapshot
    H->>V: Run mandatory production-safe E2E
    V->>E: Execute read-only packs
    V-->>H: Terminal snapshot-bound result
    H->>E: Verify production snapshot is unchanged
    H->>G: Conclude production Check Run
    H-->>A: Production deployed and validated
    A-->>D: Feature is verified in production
```

## State ownership

### Authoritative state

- Pull-request identity and head SHA: GitHub Pull Requests.
- CI and review readiness: GitHub checks and reviews.
- Deployment execution: canonical GitHub Actions workflow run.
- Baseline validation execution and evidence: frontend-owned GitHub Actions E2E
  workflow run bound to an exact environment snapshot.
- Deployment history: GitHub Deployment and Deployment Status records.
- PR-visible progress: GitHub Check Run.
- Actual deployed identity: environment-specific runtime version endpoint or
  infrastructure version identifier.

### Minimal Deploy Hub state

Deploy Hub may persist only what cannot be derived reliably:

- Request ID and immutable payload.
- Requester and originating task reference.
- Waiting order when a target is busy.
- Idempotency evidence.
- Cancellation intent not yet reflected in a workflow.
- Validation ID, immutable environment snapshot, pack policy, and links to the
  linked deployment and E2E runs.

The MVP uses GitHub-native records for durable evidence and reconstructs state
from GitHub and runtime truth. It does not add a database or S3 request ledger.
The exact GitHub representation for waiting order and idempotency must be
validated during implementation design. A database-backed release state
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

After loading an authoritative snapshot, the browser subscribes to a
server-sent event stream. State transitions, new requests, queue changes,
blockers, validation ownership, and deployed-version changes are emitted as
events. HTTP remains the command path for retry and cancellation. On
disconnect, the browser reconnects and reloads a snapshot before applying new
events. Bounded automatic polling is the fallback, so a transport interruption
never makes manual browser refresh part of normal operation.

## Authentication and permissions

An organization-owned GitHub App authenticates control-plane activity. Its
first shadow installation is physically read-only. Contents read, Check Run
write, workflow dispatch, repository mutation, and environment authority are
separate permissions introduced only when the rollout phase needs each one.

## Deployment adapter mapping

| Component | Environment | Canonical entry point |
| --- | --- | --- |
| Frontend | Staging | Non-force integration into `1a-staging`, triggering `deploy-staging.yml` |
| Frontend | Production | `build-upload-deploy-prod.yml` from exact `main` |
| Backend | Staging | `deploy.yml` with exact SHA and selected services |
| Backend | Production | `deploy.yml` with exact `main` SHA and selected services |

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
