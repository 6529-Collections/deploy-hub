## Short version

Release Bus v2 is a database-backed deployment controller coordinating the frontend repo, backend repo, and independently deployable backend services.

It turns an exact PR head SHA into:

1. An immutable candidate.
2. A dependency-ordered release train.
3. Fresh environment-specific artifacts.
4. Idempotent GitHub Actions operations.
5. An exact deployment manifest.
6. E2E-backed staging or production evidence.

Production is never automatic after staging.

```mermaid
flowchart LR
    A["Open PR at exact head SHA"] --> B["Register immutable candidate"]
    B --> C["Scheduler claims dependency-closed train"]
    C --> D["Compose frontend and backend"]
    D --> E["Fresh environment-bound artifacts"]
    E --> F["Staging lock and 1a-staging CAS"]
    F --> G["Backend DAG and frontend deployment"]
    G --> H["Manifest-bound staging E2E"]
    H --> I["STAGING_VALIDATED"]
    I --> J["Explicit production selection"]
    J --> K["Fresh production composition and artifacts"]
    K --> L["Production lock and main CAS"]
    L --> M["Production deploy and read-only E2E"]
    M --> N["PRODUCTION_DEPLOYED"]
```

## The core objects

The durable state lives in MySQL tables for candidates, dependencies, trains, operations, manifests, locks, controls, and audit events. Updates use `row_version` optimistic concurrency; operations have unique idempotency keys. See the [v2 schema](/Users/tarmokalling/6529/6529seize-backend/migrations/20260723033000-create-release-bus-v2-tables.js:4).

- Candidate: one repository, PR, branch, and exact 40-character head SHA. Backend candidates also carry deployable services and a service dependency DAG.
- Train: an immutable, dependency-closed batch for staging or production.
- Operation: one external action such as compose, build, ref advance, service deploy, or E2E.
- Manifest: the exact frontend SHA, backend SHA, artifact digests, candidates, operations, and E2E identity.
- Locks: a short scheduler lock plus separate staging and production environment locks.
- Events: the append-only audit trail and recovery explanation.

## 1. Routing: staging and production are independent lanes

The live status comes from the backend controls endpoint. Effective lane state is calculated as:

```text
ON = mode allows the lane
     AND ALL is not paused
     AND the individual lane is not paused
```

`changeable` is true only when the internal capability ceiling allows the lane and the `ALL` hard stop is clear. That logic is in [release-bus-v2.config.ts](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.config.ts:320).

The practical routing contract is:

- Lane `ON`: Release Bus exclusively owns deployments to that environment.
- Lane `OFF`, `changeable: true`: serialized manual fallback may be used after all drain checks.
- Lane `OFF`, `changeable: false`: deployment is blocked. Raw mode `OFF` and the global `ALL` pause are hard fences, not manual-fallback switches.

The status helper authenticates with `gh`, calls the API, independently recomputes the expected lane states, validates the authoritative staging identity, and fails closed on malformed or inconsistent data.

There is also an exact synthetic-candidate beta allowlist. It is an internal rollout mechanism and does not turn the normal operator-facing lane `ON`.

## 2. Candidate registration

Registration through `/deploy/ui/bus` or `POST /deploy/release-bus-v2/candidates` verifies:

- The caller has write access.
- The PR is still open.
- The branch resolves to the submitted SHA before and after qualification.
- The PR has an exact merge-tree SHA.
- All current head checks are terminal and green.
- The required PR CI workflow and evidence artifact match the exact head and merge tree.
- Trusted CI workflow and policy files have not changed without a pre-authorized transition.
- Backend deploy units are allowlisted and the combined DAG is acyclic.
- Candidate dependencies exist and do not create a cycle.
- A backend candidate does not require frontend-first deployment.

The implementation starts in [release-bus-v2.service.ts](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.service.ts:734).

A new head for the same PR supersedes the old immutable candidate. GitHub push webhooks and the reconciler also detect moved or deleted branches.

## 3. Scheduling, composition, and artifact preparation

The `releaseBusV2Reconciler` Lambda runs every minute with reserved concurrency 1; database locks still protect it against API-triggered or overlapping invocations. See [serverless.yaml](/Users/tarmokalling/6529/6529seize-backend/src/releaseBus/serverless.yaml:19) and the [reconciler entry point](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.reconciler.ts:1610).

For each enabled lane it:

1. Resolves both repositories’ exact `main` and `1a-staging` heads.
2. Acquires the scheduler lock.
3. Selects a dependency-closed candidate set.
4. Persists an immutable train.
5. Advances that train until it reaches an external workflow wait.

Frontend and backend composition/preflight run concurrently. Normal train preflight does not rerun the whole repository test suite: the bus reuses exact green PR CI evidence, but freshly creates environment-specific package bytes.

For staging, the release commit is based structurally on the current `1a-staging` commit and incorporates current `main` plus the cumulative candidate set. This makes the resulting `1a-staging` update fast-forwardable.

For production, composition starts freshly from the current production `main` bases. Staging artifact bytes are never reused for production.

## 4. Staging is cumulative

Staging maintains an authoritative admitted set:

- Previously validated, unchanged candidates are carried forward.
- Newly ready candidates are added as one dependency-closed set.
- A newer SHA for the same PR replaces the old live SHA only after the replacement manifest validates.
- Explicit removal and absorption into `main` are the other normal ways to leave the staging set.
- Production selection does not remove anything from staging.

After preparation, the controller:

1. Proves there are no conflicting staging deployment/E2E workflows.
2. Acquires `staging-environment`.
3. Repeats the idle/ref snapshot under the lock.
4. Advances affected `1a-staging` refs through non-force compare-and-swap.
5. Deploys independent backend DAG layers concurrently.
6. Deploys frontend after backend only when an explicit frontend→backend dependency requires it.
7. Writes a `STAGING_DEPLOYED` manifest.
8. Runs E2E from an immutable frontend ref with the manifest identity.
9. Rechecks refs and all intervening staging workflows.
10. Commits `STAGING_VALIDATED` only if everything still agrees exactly.

That state machine is in [advanceStagingOrQualification()](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.reconciler.ts:4421).

`STAGING_DEPLOYED` therefore means “the bytes were deployed, but validation is still pending.” It is not production evidence.

## 5. Production is a separate explicit decision

A developer/operator explicitly selects one or more unchanged staging-validated candidates. The selection is atomic and must be transitively dependency-closed. A production prerequisite may be omitted only if its exact identity already has successful production manifest and E2E evidence.

For a new production train, the bus:

1. Revalidates each candidate’s staging train, manifest, artifact, and successful E2E operation.
2. Rechecks every branch head.
3. Freshly composes against both current `main` bases.
4. Freshly builds production-bound artifacts.
5. Creates a `PRODUCTION_CANDIDATE_EVIDENCE_QUALIFIED` audit manifest.
6. Acquires `production-environment`.
7. Non-force CAS-advances affected `main` refs to the exact prepared commits.
8. Deploys backend services in DAG order and dependent frontend afterward.
9. Runs mandatory production-safe read-only E2E.
10. Creates `PRODUCTION_DEPLOYED`.

The current production path is in [advanceProduction()](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.reconciler.ts:5531).

Staging and production have separate environment locks, so unrelated staging and production work can proceed concurrently.

Release Bus does not author release notes. Production backend operations pass canonical per-PR grouping and finalization metadata to the existing autonomous release-note system.

## Why workflow execution is hard to spoof or duplicate

Every GitHub workflow is represented by an operation with an immutable key such as:

```text
rb2:<train-id>:deploy:prod:backend:api:a1
```

Before doing meaningful work, the workflow calls the API’s authorization endpoint. The backend verifies:

- Train and operation attempt.
- Expected repository, environment, service, SHA, and artifact digest.
- GitHub workflow run ID.
- Release Bus GitHub App actor.
- `workflow_dispatch` event.
- Exact workflow path and workflow-control commit.
- Operation key embedded in the run title.
- Exact artifact and candidate-evidence identity.

Terminal callbacks are also immutable: an identical duplicate is accepted; a different second result is rejected. Infrastructure and explicitly retryable deployment failures reuse the same logical operation with bounded attempts. See [release-bus-v2.operations.ts](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.operations.ts:645).

Git writes are additionally restricted to `main`, `1a-staging`, and named Release Bus temporary refs, always using non-force compare-and-swap.

## Failure and recovery behavior

Important cases:

- Merge conflict: the directly affected candidate becomes `NEEDS_REBASE`; dependants wait.
- Grouped staging preflight failure: no automatic bisection. The affected repository’s new group fails once; unrelated candidates return to the next train.
- Infrastructure failure: bounded retry of the exact operation; candidates are not blamed.
- Staging deploy or E2E failure: the manifest remains unvalidated. For cumulative staging, the bus creates a new forward-only restore commit with the last validated tree, deploys it, and runs rollback E2E. It never force-pushes staging backwards.
- Staging ref drift: staging alone pauses and exact state is retained for recovery.
- Production base moves before mutation: explicit production intent is preserved and a fresh audited replacement train is planned.
- Failure after `main` advances: production pauses, candidates fail closed, and later production trains are blocked until exact `main`/runtime parity or an explicit rollback is proven. The bus does not rewrite `main` to hide the failed release.
- Locks are retained while any dispatched operation has an ambiguous or nonterminal result.

## Manual fallback

Manual workflows call the backend readiness endpoint before checkout, build, cloud credentials, ref mutation, or deployment. The guard requires:

- Target lane `OFF`.
- `changeable: true`.
- No hidden hard stop.
- Environment lock completely free.
- No active train for that lane.
- No nonterminal Release Bus operation.
- No active frontend or backend mutation/E2E workflow.
- Exact current `1a-staging` or `main` source SHA.

This is enforced in [release-bus-v2.manual-deployment.ts](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.manual-deployment.ts:203).

Manual backend services are deliberately dispatched sequentially because the legacy workflow’s shared concurrency can otherwise interfere with sibling runs.

## What it guarantees—and what it does not

The bus gives you exact identity, ordering, immutable evidence, non-force ref updates, bounded retry, environment exclusion, and deterministic recovery.

It does not make a multi-service release transactionally atomic. In production, code reaches `main` before runtime deployment, and a partial cross-repository advance can require operator recovery. Zero-downtime still depends on:

- Backward-compatible database/API changes.
- Correct backend service DAGs.
- Explicit backend-before-frontend candidate dependencies.
- Deploy workflows that perform safe rolling/versioned infrastructure changes.

I analyzed the local backend at `ec7fc0a17` and frontend at `fc0f521b4`. The frontend checkout currently reports 30 commits behind `origin/main`, so this explains the code physically present on your machine, not necessarily the newest remote frontend revision. I did not query live lane state or mutate anything.