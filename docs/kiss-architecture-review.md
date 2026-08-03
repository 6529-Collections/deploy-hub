# Deploy Hub KISS Architecture Review

Status: Open decision gate before Task 7

Date: 2026-08-03

## Purpose

Deploy Hub exists because Release Bus became overengineered and globally
coupled. This review tests every proposed Deploy Hub mechanism against one rule:

> Add complexity only when a current required outcome cannot be achieved with
> an existing repository/GitHub primitive or a materially smaller component.

This review changes the authentication and UI-update defaults where the owner
has already made the decision. It only flags the remaining architecture; it
does not complete Task 7 or authorize live capability.

## Requirements that remain justified

These outcomes have concrete evidence and are not KISS violations:

- Start over rather than extend Release Bus.
- One exact SHA per deployment operation.
- Use each repository's canonical staging and production workflow.
- Do not rebuild frontend/backend build or AWS deployment logic in Deploy Hub.
- Frontend and unrelated backend deployments must not globally block each
  other.
- Provide a substantially better operational UI with no manual refresh.
- Provide useful current deployment feedback on the owning PR.
- Require health, exact runtime identity, and the accepted baseline E2E policy.
- Keep canonical manual workflows available while Deploy Hub is unavailable.
- Reuse repository-owned deployment notifications and release-note automation.
- Keep Release Bus OFF and remove it only after Deploy Hub burn-in.

The audit concern is how these outcomes are implemented, not whether they
matter.

## Simplifications accepted now

### 1. Reuse GitHub-token authentication

Decision: accepted in ADR 0009.

Use the existing deploy UI model: GitHub Bearer token, GitHub `/user`, current
repository/operator policy, and caller-attributed GitHub actions. Do not build
wallet OAuth, PKCE, an authorization server, refresh grants, a GitHub App token
broker, or a separate Codex identity service.

### 2. Poll the UI first

Decision: accepted as the MVP default.

Poll one authenticated snapshot endpoint at least every five seconds and use
conditional responses. This satisfies “no browser refresh” without a WebSocket
topic, one-time ticket, cursor, ordered event stream, reconnect protocol, replay
logic, and polling fallback. Add push transport only if measurements show the
polling experience or API budget is inadequate.

## Stop-before-implementation flags

### K1 — Custom Git event ledger is Release Bus-shaped complexity

Severity: **Critical**

Current design:

- protected `state/v1` branch;
- immutable request files and per-request event directories;
- global and per-subject sequences;
- acceptance ordering and queue ownership;
- canonical JSON and request digests;
- derived snapshots that must replay byte-for-byte;
- non-force Git object compare-and-swap retries;
- cancellation/retry intent events;
- startup replay, tamper checks, and external reconciliation.

The credentialless prototype already contains a 1,146-line
`request-ledger.ts`, 355 lines of ledger tests, and more than 3,000 lines of
contract/schema documentation. This is an event-sourced database implemented
on top of Git. Avoiding MySQL does not make it simple.

Current evidence proves that Deploy Hub needs exact operation identity and
recoverable status. It does not yet prove it needs its own global sequence,
append-only journal, snapshot cache, custom queue, or Git-object transaction
engine.

KISS default to assess before Task 7:

1. Treat the canonical GitHub Actions run as execution truth.
2. Put the Deploy Hub operation ID and exact SHA in allowlisted workflow inputs
   and visible run metadata.
3. Use the workflow run ID plus exact SHA as the recoverable operation handle.
4. Use a commit status or workflow check for PR progress.
5. Use runtime version endpoints for deployed truth.
6. Add the smallest durable record only after one required fact cannot be
   recovered from those sources.

The Task 6 prototype is credentialless and safe to keep while deciding, but no
live `state/v1` branch or Git ledger adapter should be built until this flag is
resolved. Prior implementation effort is not evidence that the design is
needed.

### K2 — Separate deployment and validation state machines may be unnecessary

Severity: **High**

Current design gives validation its own request ID, schema, cancel/retry API,
event stream, snapshots, lock, status, task events, and reconciliation path.

KISS default:

- one deployment operation has simple phases such as `deploying`, `validating`,
  and `complete`;
- the phase links the exact E2E workflow run and before/after runtime snapshot;
- for coordinated backend/frontend work, the Codex task dispatches one E2E run
  after the final intended deployment and links that run to each operation;
- create a standalone validation resource only if developers actually need to
  request/retry validation independently of a deployment.

The baseline E2E requirement stays. The duplicate validation control plane is
what must justify itself.

### K3 — Custom queues and locks duplicate GitHub Actions concurrency

Severity: **Critical**

Current design creates deterministic waiting order, resource keys, claims,
owners, stale-owner recovery, validation locks, cancellation intent, and ETA
logic in Deploy Hub.

KISS default:

- use canonical workflow `concurrency` groups for the real mutation resource;
- use distinct environment/service groups so frontend and unrelated backend
  work do not globally serialize;
- let GitHub represent queued/in-progress runs;
- have the UI explain the observed queued run and concurrency group;
- put the short environment-stability rule around the E2E workflow using the
  smallest repository-owned concurrency primitive.

Build a Deploy Hub queue only if GitHub's real queue cannot express a concrete
cross-repository resource conflict. Do not build a general scheduler first.

### K4 — Too many projections duplicate the same operation

Severity: **High**

The current design proposes all of the following for one operation:

- Git ledger request/events/snapshot;
- GitHub Deployment and Deployment Status;
- rich Check Run;
- canonical workflow run;
- task-event callback/redelivery;
- UI event stream and history;
- runtime-version proof;
- communication outcome events.

Only the workflow run and runtime proof are unavoidable execution evidence.
PR feedback and the UI are required UX surfaces. Everything else must earn its
place.

KISS default:

- workflow run: execution state and logs;
- runtime endpoint: deployed identity;
- commit status, workflow check, or—only if required—one Check Run: PR feedback;
- polling snapshot: UI;
- request ID lookup: agent recovery.

Do not add GitHub Deployment records, task push callbacks, callback redelivery,
or a second history store until a named consumer cannot work without them.

## Important simplification candidates

### K5 — GitHub App for PR feedback is not yet justified

Severity: **High**

GitHub documents rich [Check Run writes](https://docs.github.com/en/rest/checks/runs)
as an App-oriented capability, while
[commit statuses](https://docs.github.com/en/rest/commits/statuses) can be
written by a user with push access and workflow runs already appear in PR
checks. Before creating a GitHub App:

1. test whether the approved fine-grained caller token can write the exact
   required Check Run;
2. assess whether the canonical workflow check itself plus a commit status and
   Deploy Hub link satisfies the PR-feedback requirement; and
3. if neither works, add an App with `checks:write` only.

An App added for checks must not become caller authentication, a token broker,
state-ledger owner, or AWS/deployment authority by convenience.

### K6 — `1a-deploy-hub` may be more shadow infrastructure than needed

Severity: **Medium**

The branch was proposed to test frontend integration safely, which is a valid
goal. However, a long-lived branch plus dedicated workflow, allowlist,
permissions, projected statuses, callback simulation, and maintenance can
become another deployment lane.

KISS gate: create it only for frontend Git-composition behavior that cannot be
covered by deterministic repository tests or a temporary explicit test ref. If
retained, it has one credentialless workflow and no queue/controller of its
own. It never becomes a second staging environment.

### K7 — Static UI proxy should stay tiny

Severity: **Medium**

Fetching the UI from `deploy-hub/main` is an explicit owner decision and can
remain. The risk is turning it into a release service with atomic asset
switching, cache invalidation, manifests, rollback controllers, and availability
logic.

KISS default: resolve one exact commit and serve a very small fixed file
allowlist. Consider one self-contained versioned page if mixed assets become a
real implementation problem. GitHub-origin performance optimization is later
work.

### K8 — Do not mirror the release-note state machine

Severity: **Medium**

The existing backend already owns release-note eligibility, queueing,
generation, deduplication, and publication. Deploy Hub currently proposes many
mirrored communication milestones and recovery events.

KISS default: show the canonical notification/release-note link and a small
`pending`, `published`, `skipped`, or `failed` summary only when the existing
pipeline exposes it. Do not create a second publication journal, queue, or
reconciler.

### K9 — Do not build isolated cloud infrastructure by default

Severity: **Medium**

Offline and credentialless shadow tests are justified. A new isolated AWS
deployment environment is a substantial project of its own.

KISS default: exhaust fakes, dry runs, repository integration tests, read-only
shadowing, and controlled low-risk staging canaries during a known clear window.
Provision isolated infrastructure only if a specific unsafe behavior cannot be
tested otherwise. This decision must still honor the requirement that Deploy
Hub experiments never block colleagues' ordinary staging work.

### K10 — Do not create a second backend runtime by accident

Severity: **Critical**

The current repository contains a Node HTTP server skeleton while the accepted
UI design also requires the existing 6529 backend to proxy UI files and expose
authenticated operational endpoints. The documents do not yet prove why two
server runtimes are needed or how the new server would be hosted, deployed,
secured, and monitored.

KISS default: use the existing backend API runtime for the small Deploy Hub HTTP
boundary, just as the current deploy UIs do. Keep this repository as the UI,
contracts, documentation, and credentialless domain prototype unless a concrete
isolation or ownership requirement justifies a separately deployed service.
Do not introduce another Lambda, container service, load balancer, domain,
deployment pipeline, or on-call surface implicitly through Task 7.

If implementation code must remain in this repository, first define the
smallest packaging/deployment mechanism and compare it explicitly with adding
the few routes to the existing backend.

### K11 — Metrics, ETA, and detailed diagnostics are later UX

Severity: **Low**

Rolling estimates by operation/environment, persistent historical metrics, and
a broad control-plane failure taxonomy are useful but not required to prove the
deployment path.

KISS default: initially show start time, elapsed time, GitHub's queued/running
state, exact workflow link, and concise terminal error. Add calculated ETAs and
historical analytics only after enough real runs exist and operators show that
elapsed time is inadequate.

## Complexity reviewed and retained

### Exact SHA and stale-head checks

Retain. Mutable-ref races were a concrete Release Bus failure and exact source
identity is small to enforce.

### Frontend/backend scoped concurrency

Retain the outcome. Implement it first in canonical workflow concurrency rather
than in a new scheduler.

### Baseline E2E after deployment

Retain. The owner accepted its approximately seven-minute staging and
four-minute production cost. Keep orchestration in repository workflows and
avoid a second validation platform.

### Manual canonical fallback and delayed Release Bus cleanup

Retain. This is migration safety, not runtime architecture complexity.

### Repository-owned notifications and release notes

Retain. Reuse is simpler than rebuilding them inside Deploy Hub.

## Required decisions before Task 7 expands implementation

1. **Ledger:** Can the MVP use GitHub workflow/run/status/runtime evidence
   without `state/v1`? The KISS recommendation is yes until disproven.
2. **Validation:** Can E2E be a phase/link of deployment rather than a separate
   operation API? The KISS recommendation is yes.
3. **Concurrency:** Can repository workflow concurrency express the real
   resource locks? The KISS recommendation is to try it first.
4. **PR feedback:** Can workflow checks or commit statuses satisfy the UX before
   adding a GitHub App? The KISS recommendation is to test them first.
5. **Shadow branch:** Is there one concrete frontend composition case that
   requires `1a-deploy-hub`? Keep it only if yes.
6. **Runtime:** Can the small API live in the existing backend rather than a new
   Deploy Hub server? The KISS recommendation is yes until disproven.

Until those decisions are resolved, Task 7 remains `NOT STARTED`; no existing
task status changes in this review.
