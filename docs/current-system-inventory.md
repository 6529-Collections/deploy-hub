# Current Deployment-System Inventory

Status: Task 1 audit complete

Audit date: 2026-08-03

## Audit boundary

This inventory is the implementation baseline for Deploy Hub. It records live
control posture and repository behavior without dispatching a workflow,
changing a branch, changing a credential, changing an environment, or changing
a Release Bus control.

The audit used current fetched remote refs and read-only GitHub/API queries.
The only checkout update was a safe fast-forward of the clean frontend stable
`main` checkout to the already-fetched `origin/main` commit. No source-repository
file was edited.

## Exact source snapshot

| Source | Exact inspected state | Disposition |
| --- | --- | --- |
| Deploy Hub | `327157b82fe2da6e2c2765a0e3a49efd8696e6c5` on `main` before this inventory | Specification-only baseline |
| Frontend `main` | [`d9d1e1f74b87df694cc1e8873c82dc07942e7980`](https://github.com/6529-Collections/6529seize-frontend/commit/d9d1e1f74b87df694cc1e8873c82dc07942e7980) | Authoritative frontend implementation |
| Frontend `1a-staging` | `aa8388a5b2c572330e929e4fc822bcd43602c5ca` | Current remote staging ref at final audit refresh |
| Backend `main` | [`972d860d20dd512f4e039ab07350037e332e83be`](https://github.com/6529-Collections/6529seize-backend/commit/972d860d20dd512f4e039ab07350037e332e83be) | Authoritative backend implementation |
| Backend `1a-staging` | `79c8864bab24df8715c2fd85a669eee3f26d2f0e` | Current remote staging ref at audit time |
| Backend PR #1869 | [`5b61104b94573f792559272da7db60fa03bbc0fc`](https://github.com/6529-Collections/6529seize-backend/pull/1869/commits/5b61104b94573f792559272da7db60fa03bbc0fc) | Open, ready-for-review, unmerged, currently conflicting with `main`; five commits behind current `main`; no GitHub Deployment for this SHA |
| Frontend PR #3504 | [`b798c0d344b9c8ffaecc402c7f38f39bddd2df2a`](https://github.com/6529-Collections/6529seize-frontend/pull/3504/commits/b798c0d344b9c8ffaecc402c7f38f39bddd2df2a) | Open, ready-for-review, unmerged, mergeable but one commit behind current `main`; no GitHub Deployment for this SHA |
| Source Codex task | `019faa0e-272b-7f62-843a-79fffb815a7e` | No active turn at audit time; both implementation PRs remain open, so their changes are proposed evidence rather than `main` behavior |

## Authoritative live Release Bus posture

The repository-authenticated read-only status helper reported:

| Item | Live value |
| --- | --- |
| Staging lane | `OFF`, changeable |
| Production lane | `OFF`, changeable |
| Current staging state | `LIVE` |
| Current staging manifest | `e9601879-4649-4c04-9d98-c7754a19d75f` |
| Current staging frontend SHA | `e2c267f261fca9f2a118b825270425a64de189df` |
| Current staging backend SHA | `cc406d73bf658521423986b5b97e17fa87f99303` |
| Current staging refs | Match the two recorded runtime SHAs |
| Current staging clean-main flag | `false` |

The live control reasons describe a temporary serialized manual fallback, a
temporary E2E waiver, and Release Bus remediation. That text is current
operational state, not the accepted Deploy Hub policy. Deploy Hub instead
requires permanent Release Bus dormancy during migration and mandatory
snapshot-bound staging and production E2E.

### Critical finding: OFF is not independent

All current canonical deployment workflows call the backend Release Bus v2
manual-readiness endpoint before doing work:

```text
/deploy/release-bus-v2/manual-deployment-readiness
```

Therefore Release Bus can remain OFF while still acting as the mandatory
authorization and serialization control for every manual frontend and backend
deployment. Removing or breaking Release Bus now would break the fallback that
the team currently uses. Deploy Hub must first generalize these guards into a
small Deploy Hub/manual safety contract; Release Bus cleanup is later work.

The status helper does not enumerate every active train or operation. This
audit therefore proves the two lane controls are OFF but does not claim that
the old database contains no nonterminal historical object. Final cleanup must
run a separate quiescence proof.

## Canonical deployment paths

### Frontend staging

File: `6529seize-frontend/.github/workflows/deploy-staging.yml`

| Property | Current behavior |
| --- | --- |
| Trigger | Push to `1a-staging`; also `workflow_dispatch` |
| Source input | The workflow run's exact `github.sha`; no branch/SHA dispatch input |
| Precondition | Release Bus manual-readiness call must approve the exact run, ref, SHA, and `STAGING` environment |
| Work before mutation | Checkout exact SHA, create deployment manifest and GitHub Deployment, validate configuration, configure AWS, verify the staging EC2 instance is online |
| Mutation boundary | SSM command to the staging EC2 instance; the remote command fetches `1a-staging`, rejects a moved ref, resets the deploy checkout to the expected SHA, and runs `SKIP_STAGING_PULL=1 ./bin/6529 staging` |
| Build/test scope | Builds the frontend deployment on the staging host. The workflow does not run the PR unit-test suite or the post-deploy Playwright suite before mutation |
| Concurrency | One global `staging-deploy` group, `cancel-in-progress: false` |
| Runtime proof | Remote checkout and PM2 proof plus `https://staging.6529.io/api/version` exact-SHA verification |
| Durable output | GitHub Deployment/statuses, `deployment-bus-manifest.json`, release report, GitHub artifact, best-effort S3 version evidence, workflow conclusion |
| Communications | Repository notifier posts staging success/failure after deployment; notifier failure is `continue-on-error` |
| Fallback | Manual dispatch of this same workflow, but the fallback still depends on Release Bus manual readiness |

The push trigger is the desired repository-native staging path. Deploy Hub
must preserve it or dispatch the same repo-owned behavior without copying its
build or AWS implementation.

### Frontend production

File: `6529seize-frontend/.github/workflows/build-upload-deploy-prod.yml`

| Property | Current behavior |
| --- | --- |
| Trigger | `workflow_dispatch` only |
| Source input | The exact `github.sha` resolved by dispatch; workflow accepts no explicit SHA input |
| Precondition | Release Bus manual-readiness approval plus an exact `refs/heads/main` assertion |
| Work before mutation | Checkout, manifest and GitHub Deployment creation, frozen dependency install, package-version lint, application build/package, AWS setup, last-moment proof that `main` has not moved |
| Mutation boundary | First production S3 asset sync, followed by Elastic Beanstalk application-version creation and environment update |
| Build/test scope | Builds the production web application and validates its package. It does not run the PR unit-test suite or production Playwright suite before mutation |
| Concurrency | One global `web-deploy-prod` group, `cancel-in-progress: false` |
| Runtime proof | Elastic Beanstalk health/readiness and VersionLabel checks, three exact matches from `https://6529.io/api/version`, then published announced-version evidence |
| Durable output | GitHub Deployment/statuses, deployment manifest/report artifact, best-effort S3 evidence, announced-version JSON, workflow conclusion |
| Communications | CI success/failure post; production success can request asynchronous release-note generation; notifier failure is non-gating |
| Fallback | Manual dispatch of this same workflow from exact current `main`, still subject to Release Bus manual readiness |

### Backend staging

File: `6529seize-backend/.github/workflows/deploy.yml`, generated from
`src/config/deploy-services.json` by `scripts/generate-deploy-config.mjs`.

| Property | Current behavior |
| --- | --- |
| Trigger | `workflow_dispatch` only |
| Source inputs | `environment=staging`, exactly one allowlisted `service`, dispatch ref/SHA, manual release-note/PR metadata, optional emergency API bootstrap; Release Bus-only fields are empty in manual mode |
| Precondition | Input validation, then Release Bus manual-readiness approval for exact run/ref/SHA/environment/service |
| Work before mutation | Checkout exact dispatch SHA, frozen deploy-tool install, root/service/API dependencies as needed, and build only the selected service/API surface |
| Mutation boundary | Selected service's Serverless/AWS deployment command or special Lambda/API path |
| Build/test scope | Builds the selected service and required shared/API code. It does not build every backend service and does not run the full unit or E2E suite |
| Concurrency | Workflow-level `deploy-control-staging-manual` serializes **all manual backend staging services**. A second service-scoped `deploy-service-staging-<service>` lock also exists. Release Bus operations avoid the global manual key by using an operation key |
| Runtime proof | Release Bus mode verifies Lambda code hashes and API exact version. Manual mode does not run those Release Bus-conditioned exact-code/API-health steps, leaving weaker proof |
| Durable output | Workflow conclusion; Release Bus mode reports structured result; manual mode can post a baseline-adoption event; CI notification is non-gating |
| Fallback | Manual dispatch of the same workflow, normally one service at a time; still Release Bus-readiness dependent |

### Backend production

The same backend workflow owns production.

| Property | Current behavior |
| --- | --- |
| Trigger | `workflow_dispatch` only |
| Source inputs | `environment=prod`, exactly one allowlisted service, exact dispatch ref, and explicit PR/release-note grouping or explicit no-PR opt-out |
| Precondition | Manual-readiness approval, `main` source enforcement, production/release-note metadata validation, then environment credentials |
| Mutation boundary | Selected production service's Serverless/AWS deployment or special API/Lambda path |
| Build/test scope | Builds the selected service and required shared/API code; no complete repository test suite or production E2E before mutation |
| Concurrency | `deploy-control-prod-manual` globally serializes all manual production services, plus `deploy-service-prod-<service>` |
| Runtime proof | Strong exact code hash/API version proof exists only in the Release Bus operation branch; manual mode needs equivalent generic proof |
| Durable output | Workflow conclusion and non-gating CI/release-note side effects; no generic structured Deploy Hub result today |
| Fallback | Manual one-service dispatch of the same workflow, still Release Bus-readiness dependent |

### What actually causes the blocking complaint

The canonical frontend and backend workflows do not run every repository unit
test before deploying. The broader blockage comes from control-plane
serialization and Release Bus orchestration:

- frontend staging is one global web mutation lane, which is correct for one
  shared frontend environment;
- frontend production is independently serialized;
- backend manual mode unnecessarily places unrelated services behind one
  environment-wide `manual` mutex before the service-specific mutex;
- Release Bus added trains, composition, artifact preparation, manifests,
  callbacks, database locks, and environment-wide lifecycle ownership around
  those canonical paths;
- mandatory E2E should block only the short same-environment validation window,
  not unrelated builds, PR CI, the other environment, or independent backend
  services.

## E2E inventory

Detailed pack coverage and measured duration are retained in
`docs/e2e-validation-analysis.md`.

| Property | Staging | Production |
| --- | --- | --- |
| Workflow | `6529seize-frontend/.github/workflows/staging-e2e.yml` | `6529seize-frontend/.github/workflows/production-e2e.yml` |
| Trigger | Automatic `workflow_run` after successful frontend `Web Deploy - STAGING`, or manual dispatch | Manual dispatch only |
| Baseline suite | 12 read-only post-deploy packs | 11 production-safe read-only packs |
| Concurrency | One `staging-e2e` group, no cancellation | One `production-e2e` group, no cancellation |
| Credentials | GitHub contents/artifact access, test environment configuration; explicit bound runs also require Release Bus workflow credential | Release Bus workflow credential plus test environment configuration |
| Binding | Automatic run may have `release_binding: null`; explicit bound run requires train/revision/operation/manifest and SHA/digest inputs | Train/revision/operation/manifest identity is mandatory |
| Callback | Bound runs call Release Bus authorize/report-progress | Always calls Release Bus authorize/report-progress |
| Evidence | Structured evidence artifact; pack/setup status and optional Release Bus binding | Structured release-bound evidence artifact |
| Failure | Setup/infrastructure failure is retryable; product E2E failure is non-retryable | Same classification |
| Observed normal duration | About 7 minutes | About 4 minutes |

Current gaps:

1. A backend-only staging deploy does not automatically cause baseline E2E.
2. Automatic frontend staging E2E does not prove one immutable frontend plus
   per-service backend environment snapshot.
3. Explicit staging and all production E2E are Release Bus-only contracts.
4. Canonical manual production has no generic E2E continuation.
5. There is no before-and-after snapshot equality check that rejects a result
   if any relevant runtime changed while the suite ran.
6. A coordinated frontend/backend change has no small reusable validation ID;
   Release Bus models it as a train/manifest instead.

## Deployment communications and release notes

### Current `main` path

```text
canonical workflow
  -> repository scripts/notify-ci-wave.mjs
  -> HMAC-authenticated POST /ci-pipeline-alerts
  -> backend CI alert receiver
  -> CI wave drop
  -> production-only release-note eligibility
  -> best-effort SQS enqueue
  -> releaseNotesGenerationLoop
  -> GitHub range/PR evidence + prompt
  -> release-note drop or skip/failure in logs
```

| Concern | Current file/workflow and exact behavior |
| --- | --- |
| Workflow fields | Frontend manual workflows and backend `deploy.yml` pass environment, service, run identity and exact/fallback SHA to their notifier. Release Bus paths can additionally pass train and caller-supplied contributor metadata |
| Sender auth | Both notifier scripts sign `timestamp + raw body` with `CI_PIPELINES_ALERT_SECRET`; optional `x-6529-auth` remains separate compatibility auth |
| Receiver auth | `src/api-serverless/src/ci-pipeline-alerts/ci-pipeline-alert.routes.ts` verifies HMAC and a five-minute timestamp window before Joi validation |
| Notification dedupe | Same route hashes a subset of notification fields, uses a 300-second Redis processing lock and 24-hour processed key. If Redis is absent or errors, it deliberately posts without dedupe |
| CI post | `ci-pipeline-alert.service.ts` creates the wave drop and maps the workflow actor when possible; failures are logged by the route and the current response is still `{}` |
| Contributor evidence | Current `main` trusts contributor logins only when accompanied by a Release Bus train ID and the actor is the Release Bus GitHub App. Manual canonical deployments do not derive exact contributors |
| Release-note gate | Successful production notification with allowed prompt, SHA, deployment time, and valid release group; staging is ineligible |
| Queue | `src/release-notes/release-note-generation-queue.ts` sends best-effort to SQS and logs enqueue failure without returning it |
| Generation | `src/releaseNotesGenerationLoop/index.ts` invokes `release-note-generation.service.ts`; `release-note-github.service.ts` selects approved prior production workflow evidence, compares ranges, resolves PRs/contributors, and rejects unsafe ranges |
| Baseline | Frontend recognizes `Web Deploy - PROD`; backend recognizes successful runs whose display title matches the production service convention. Release Bus production history is part of the proposed PR update, not current `main` |
| Idempotency/recovery | Generator dedupe prevents repeated publication and range rules fail closed, but CI-drop dedupe degrades open on Redis failure; queue/generator outcomes are not returned to the deploy workflow or exposed as a complete machine-visible lifecycle |
| Gating | Workflow notification steps use `continue-on-error`; release notes are asynchronous and do not determine environment deployment success |

### Open PR delta, not yet authoritative

Backend [PR #1869](https://github.com/6529-Collections/6529seize-backend/pull/1869)
and frontend [PR #3504](https://github.com/6529-Collections/6529seize-frontend/pull/3504)
propose the stronger foundation already summarized in
`docs/deployment-communications-analysis.md`:

- verify approved workflow/run/path/branch/SHA evidence through bounded GitHub
  calls;
- derive frontend contributors from the exact production deployment range and
  backend contributors from exact PR/service evidence rather than trusting a
  manual list;
- bind Release Bus attribution to both train and operation key;
- distinguish CI-drop acceptance/duplicate/failure from release-note
  enqueued/skipped/ineligible/queue-failed outcomes;
- validate safe production history, same-SHA redeployment, and diverged ranges;
- make backend multi-service release groups explicit.

Because neither PR is merged, Deploy Hub contracts must describe these as
required follow-up behavior, not claim they exist on `main`. Task 25 owns their
eventual integration and compatibility audit.

## Existing backend capabilities

| Capability | Current evidence | Deploy Hub implication |
| --- | --- | --- |
| HTTP hosting | Express API mounts `deploy.routes.ts` at `/deploy`; current HTML and JavaScript are rendered by backend TypeScript | Backend can host a Deploy Hub proxy/API without a new public application service, subject to Task 3 security design |
| Static UI behavior | `/deploy/ui`, `/deploy/ui/app.js`, `/deploy/ui/bus`, and `/deploy/ui/bus/app.js` are public shells with `no-store`; code is compiled into backend renderers, not fetched from `deploy-hub/main` | Replace the source with a private GitHub-content proxy resolved to one exact Deploy Hub commit |
| Current UI auth | Browser pastes a GitHub token, stores it in `localStorage`, and sends it as Bearer auth; backend checks viewer/repository write/operator status | Do not reuse this browser-token model; Deploy Hub requires normal 6529 wallet/JWT auth and server-held GitHub App credentials |
| HTTP user auth | `auth/auth.ts` provides Passport JWT required/optional middleware and profile resolution | Reusable primitive, but current deploy routes do not apply it |
| Live transport | Production WebSocket support exists through API Gateway and authenticates the same JWT; current protocol handles auth, notification identity sync, wave subscription, and typing | Transport infrastructure is reusable in principle, but no Deploy Hub topic, authorization, replay cursor, or events exist |
| Server-sent events | No `text/event-stream` or `EventSource` implementation exists at the inspected backend SHA | SSE support is unproven; the accepted no-refresh requirement must retain bounded polling fallback, and Task 3/10 selects the secured transport |
| Current UI refresh | Manual deploy UI polls run history every 15 seconds; Release Bus UI polls every 30 seconds when the user is not interacting | Polling is proven, but current intervals and interaction suppression do not meet immediate, always-current Deploy Hub UX by themselves |
| GitHub access | `deploy.github.service.ts` already reads refs/runs, resolves exact heads, checks repo write access, and dispatches canonical workflows using a user token | Useful behavior can be extracted behind an organization GitHub App; user token storage and Release Bus guard calls are not retained |

## Release Bus dependency and change map

The categories below name the complete runtime/control surface discovered at
the inspected heads. Documentation-only references and archived workstreams
are not runtime dependencies; their cleanup is editorial and deferred.

### Frontend: retain and generalize

| Files | Purpose | Required disposition |
| --- | --- | --- |
| `.github/workflows/deploy-staging.yml` | Canonical staging build/mutation/proof and manual Release Bus readiness gate | Retain deployment owner; replace readiness call with generic exact-request/manual guard; add Deploy Hub identity/result contract |
| `.github/workflows/build-upload-deploy-prod.yml` | Canonical production build/mutation/proof and manual Release Bus readiness gate | Same; retain main-movement and exact-runtime safeguards |
| `.github/workflows/staging-e2e.yml` | Read-only staging suite, automatic frontend trigger, Release Bus binding/callback | Retain packs/evidence; generalize to snapshot validation ID and backend-only/coordinated use |
| `.github/workflows/production-e2e.yml` | Read-only production suite, entirely Release Bus-dispatched | Retain packs/evidence; add generic exact snapshot dispatch |
| `ops/scripts/deployment-bus.cjs` | GitHub Deployment, manifest, version-proof and report helper shared by canonical workflows | Retain and generalize names only where train-specific |
| `ops/deployment-bus/manifest.v1.schema.json` | Existing deployment evidence schema | Retain compatible evidence; do not confuse it with a Deploy Hub request ledger |
| `scripts/e2e-packs.cjs` | Pack selection/execution/evidence | Retain as frontend-owned adapter implementation |
| `scripts/release-bus-baseline-adoption-decision.cjs` | Decides whether automatic staging E2E should call Release Bus baseline adoption | Remove after the generic snapshot dispatch replaces adoption |
| `scripts/notify-ci-wave.mjs` | CI drop and release-note request sender; current Release Bus contributor semantics | Retain repository ownership; generalize immutable Deploy Hub authority/provenance |

Related contract tests that must be updated with those changes are
`__tests__/scripts/deployment-bus.test.ts`, `e2e-packs.test.ts`,
`manual-deploy-routing-guard.test.ts`, and
`release-bus-baseline-adoption-decision.test.ts`.

### Frontend: retire after burn-in

| Files | Purpose |
| --- | --- |
| `.github/workflows/release-bus-deploy-staging.yml` | Train artifact staging deployment, authorization and callback |
| `.github/workflows/release-bus-deploy-production.yml` | Train artifact production deployment, authorization and callback |
| `.github/workflows/release-bus-v2-compose.yml` | Composed train branch/artifact construction |
| `.github/workflows/release-bus-v2-preflight.yml` | Train preflight and immutable artifact preparation |
| `.github/workflows/release-bus-v2-advance-staging-ref.yml` | Release Bus staging-ref advancement |
| `scripts/release-bus-install-dependencies.cjs` | Release Bus artifact dependency installation |
| `ops/deployment-bus/release-bus-performance-contract.v1.json` | Release Bus performance policy |
| `ops/scripts/release-bus-status.mjs` and `.test.ts` | Release Bus control/status helper |

Their dedicated tests are
`release-bus-artifact-compatibility.test.ts`,
`release-bus-install-dependencies.test.ts`,
`release-bus-performance-contract.test.ts`,
`release-bus-v2-advance-staging-ref-workflow.test.ts`, and
`release-bus-v2-compose-workflow.test.ts`. Remove them only with the behavior
they protect.

### Backend: retain and generalize

| Files | Purpose | Required disposition |
| --- | --- | --- |
| `.github/workflows/deploy.yml` | Canonical one-service deploy, Release Bus artifact path, manual readiness, global manual mutex, exact proof and communications | Retain canonical owner; remove global manual mutex in favor of scoped service/environment ownership; make exact proof generic; replace Release Bus guard/operation fields |
| `scripts/generate-deploy-config.mjs` and `src/config/deploy-services.json` | Generate deploy workflow/service allowlist and include the `releaseBus` service | Retain generator; later remove Release Bus service/functions and obsolete inputs |
| `src/api-serverless/src/deploy/deploy.github.service.ts` | Ref/run lookup, permissions, workflow dispatch | Retain/extract generic GitHub adapter; replace user-token authority |
| `src/api-serverless/src/deploy/deploy.routes.ts` | Mixed manual UI and Release Bus API surface | Split: retain generic deploy endpoints only after new auth/contracts; retire all Release Bus routes |
| `src/api-serverless/src/deploy/deploy.validation.ts` | Mixed manual dispatch and Release Bus request validation | Split/generate from accepted Deploy Hub contracts |
| `src/api-serverless/src/ci-pipeline-alerts/ci-pipeline-alert.routes.ts` | HMAC validation, Release Bus contributor fields, Redis dedupe | Retain notification receiver; generalize authority/provenance and expose typed outcomes |
| `src/api-serverless/src/ci-pipeline-alerts/ci-pipeline-alert.service.ts` | CI drop, Release Bus actor/contributor interpretation, release-note enqueue | Retain pipeline; remove train-only trust and expose non-gating side-effect outcomes |
| `src/release-notes/release-note-generation-queue.ts`, `release-note-generation.service.ts`, `release-note-github.service.ts`, `release-note-contributors.config.ts`, and `src/releaseNotesGenerationLoop/index.ts` | Async production release-note queue, evidence, generation, contributor mapping, publishing | Retain; accept immutable generic provenance and make terminal outcome observable without a second release-note store |

### Backend: retire after burn-in

| Files or exact family | Purpose |
| --- | --- |
| `.github/workflows/release-bus-v2-compose.yml`, `release-bus-v2-preflight.yml`, `release-bus-v2-advance-staging-ref.yml` | Backend train composition, preparation, and staging ref movement |
| `scripts/release-bus-backend-package-strategies.mjs`, `scripts/release-bus-package-backend.mjs`, `ops/deployment-bus/release-bus-performance-contract.v1.json` | Train artifact construction/performance policy |
| `src/releaseBus/index.ts`, `package.json`, `package-lock.json`, `serverless.yaml`, and `release-bus-v2-infrastructure.test.ts` | Scheduled reconciler/cleaner Lambda service, permissions, packaging and infrastructure test |
| `src/releaseBusV2/release-bus-v2.config.ts`, `.constants.ts`, `.github-app.ts`, `.types.ts` | Release Bus configuration, actor identity, GitHub App and domain types |
| `src/releaseBusV2/release-bus-v2.repository.ts` | Database persistence and locks |
| `src/releaseBusV2/release-bus-v2.service.ts` | Candidate/train lifecycle and environment transitions |
| `src/releaseBusV2/release-bus-v2.operations.ts` | Workflow operation dispatch/idempotency/result handling |
| `src/releaseBusV2/release-bus-v2.reconciler.ts` | Periodic lifecycle reconciliation |
| `src/releaseBusV2/release-bus-v2.manual-deployment.ts` | Current canonical manual readiness/serialization authority |
| `src/releaseBusV2/release-bus-v2.baseline-adoption.ts` | Manual baseline/E2E adoption |
| `src/releaseBusV2/release-bus-v2.candidate-deregistration.ts` | Candidate removal/transition safety |
| All matching `src/releaseBusV2/*.test.ts` | Unit, integration, migration, workflow and acceptance coverage for the preceding modules |
| `src/api-serverless/src/deploy/deploy-bus-ui.renderer.ts` and `.test.ts` | Current embedded Release Bus UI |
| `src/api-serverless/src/deploy/deploy-release-bus-routes.test.ts` | Release Bus HTTP route suite |
| `src/entities/IReleaseBusV2.ts` and Release Bus constants in `src/constants/db-tables.ts` | Ten v2 database entities/table names |
| `migrations/20260714170000-create-release-bus-tables.js`, `20260721114000-add-release-bus-force-fresh-base-canary.js`, `20260723033000-create-release-bus-v2-tables.js`, `20260724202500-retire-release-bus-v1-tables.js`, `20260727093000-add-release-bus-v2-candidate-production-evidence.js`, `20260727100000-add-release-bus-v2-cumulative-staging.js`, `20260727203000-widen-release-bus-v2-manifest-status.js`, `20260727211500-repair-release-bus-v2-manifest-status-ledger.js` | Historical and current Release Bus schema; do not drop until separately approved cleanup with backup/retention plan |
| `src/api-serverless/openapi.yaml`, root `openapi.yaml`, generated routes, generated model exports, all `ApiReleaseBusV2*.ts`, `ReleaseBusV2*.ts`, and `RepairCurrentReleaseBusV2StagingCandidates*.ts` generated models | Public/internal Release Bus API contract and generated surface |
| `ops/scripts/release-bus-status.mjs`, `.test.ts`, `release-bus-v2-fast-off.mjs`, `.test.ts` | Operational status and emergency OFF tooling |

The v2 database surface comprises candidates, candidate dependencies, trains,
train candidates, operations, locks, manifests, controls, events, and current
staging state. Deploy Hub must not recreate these train-level concepts.

## Explicit capability gaps by scenario

| Scenario | Current gap Deploy Hub must close |
| --- | --- |
| Frontend-only staging | Canonical push path is sound but Release Bus-gated; E2E binding lacks exact backend snapshot |
| Backend-only staging | Globally serialized manual services, weaker manual exact-runtime proof, no automatic E2E |
| Coordinated staging | No agent-owned small plan linking atomic deploy requests to one snapshot validation without a train |
| Frontend-only production | Canonical build/proof is sound but Release Bus-gated; no generic production E2E continuation |
| Backend-only production | Global manual serialization, one workflow per service, weaker generic runtime proof, release grouping supplied manually |
| Coordinated production | No exact agent-owned sequencing record or one shared snapshot result outside Release Bus |
| PR feedback | Canonical workflows create GitHub Deployments but do not create/update a stable Deploy Hub Check Run on every owning PR in real time |
| Waiting/ownership | GitHub concurrency queues runs, but there is no cross-repository visible scoped waiting record, deterministic owner, cancel intent, or restart reconstruction contract |
| UI | Existing UIs are embedded, token-based and polling-only; no GitHub-backed Deploy Hub UI, wallet authorization or operation event contract |
| Communications | Current `main` lacks exact manual contributor derivation and typed downstream outcomes; stronger PR implementation is still unmerged |
| Recovery | Manual exact redeploy exists, but generic cancellation, partial-mutation reconciliation, snapshot drift and side-effect retry are not one contract |

## Requirements established by evidence

These are required outcomes, not optional designs:

1. Preserve the repository-owned build, mutation, health, and exact-version
   logic in the canonical workflows.
2. Remove Release Bus as a prerequisite only after a replacement manual/Deploy
   Hub readiness contract is live and proven.
3. Scope backend mutation ownership to environment plus service; do not retain
   the current environment-wide manual mutex.
4. Make exact deployed-code/API proof apply to manual/Deploy Hub backend runs,
   not only Release Bus runs.
5. Represent every deployment by immutable source SHA and explicit environment;
   never follow a moved branch silently.
6. Create real-time PR, task and UI evidence without making CI posting or
   release-note publication deployment gates.
7. Validate each final environment outcome with one before/after-equal exact
   snapshot and the existing frontend-owned E2E suite.
8. Support frontend-only, backend-only and agent-coordinated operations without
   reintroducing release trains.
9. Preserve manual canonical fallback when Deploy Hub is unavailable.
10. Keep requester, authenticated deployment authority, workflow actor and
    evidence-derived contributors distinct.

## Proposed implementation choices, not audit facts

The following accepted direction still requires Task 2 and Task 3 contracts or
prototypes before it becomes implementation truth:

- GitHub-native Deploy Hub records instead of a new application database;
- GitHub Check Runs as the primary PR progress surface;
- an organization GitHub App rather than pasted browser tokens;
- the static UI fetched from one exact `deploy-hub/main` SHA through the
  backend;
- a secured live event channel with automatic polling fallback;
- agent-owned coordinated plans composed from atomic repository operations;
- explicit known-good redeployment rather than automatic rollback in MVP.

Task 2 must choose the exact durable GitHub representation and prove that it
supports atomic idempotency, deterministic waiting, cancellation intent and
restart reconstruction. Task 3 must decide whether the existing WebSocket
stack, a new SSE path, or polling-first delivery is the safe live transport.

## Task 1 conclusion

Task 1 is complete. The audit found no reason to salvage Release Bus as the
future product, but it did find a hard migration ordering constraint: the
current canonical fallback is still wired through Release Bus. Deploy Hub must
generalize that boundary before Release Bus code or infrastructure can be
removed.
