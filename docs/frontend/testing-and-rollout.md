# Frontend Testing and Rollout

Status: Accepted FE-only MVP

Last updated: 2026-08-04

Release Bus remains OFF. Canonical manual frontend workflows remain available
throughout rollout.

## 1. Offline contract tests

- Exact PR-head and final-target validation.
- Moved-head, unauthorized production, and arbitrary workflow/ref rejection.
- Adjacent same-target cohort partitioning without overtaking.
- Commit-status progression and exact run links.
- Queued, running, success, product failure, infrastructure failure, stale,
  cancel, and retry projection.
- Five-second polling replacement and recovery after a failed poll.
- Token canary proving credentials never enter visible or durable output.
- One-shot agent submit, status, stop, retry, and staging-removal commands using
  the same exact operation contract, including moved-SHA retry rejection.

## 2. Base FE shadow workflow

Exercise the full request, cohort, status, UI, cancel, and retry shape with
deterministic fake phases. The explicitly dispatched workflow lives in the
frontend repository and uses only its automatic, permission-limited
`GITHUB_TOKEN`; it needs no stored credential.

The shadow identity must be physically unable to:

- update `1a-staging`, `main`, or another protected ref;
- invoke canonical staging or production deployment;
- assume staging or production environment roles;
- publish real CI notifications or release notes; or
- present shadow success as deployment evidence.

Required shadow scenarios:

- one staging request;
- one production request through fake staging and production phases;
- two adjacent same-target requests;
- a mixed-target sequence;
- stale source, pre-mutation cancellation, post-mutation safe stop, same-SHA
  retry, infrastructure failure, and product failure/replay;
- a page opened before the request that updates without refresh.

## 3. Controlled staging canaries

Start in an announced low-risk window while manual deployment remains
immediately usable.

- One exact frontend staging request.
- Exact runtime proof followed by all 12 staging baseline E2E packs.
- One same-target batch.
- One mixed-target sequence proving cohorts remain separate.
- Bounded infrastructure retry.
- Product failure and non-force known-good restoration.
- Pre-mutation cancellation, post-mutation safe stop, and exact-SHA retry.
- PR feedback and live UI matching GitHub/runtime truth.
- No request outside the canary is enrolled automatically.

## 4. Controlled production canary

- Explicitly authorize low-risk production-target PRs.
- Verify whole-cohort preflight before the first merge.
- Freeze the resulting exact `main` SHA.
- Use canonical production deployment, runtime proof, and all 11
  production-safe E2E packs.
- Verify staging activity remains independent.
- Verify CI notification and production release-note outcomes without making
  either a deployment gate.
- Exercise a controlled failure or equivalent proof that exact partial truth is
  reported without automatic isolation or rollback.

## 5. Establishment gate

Deploy Hub becomes the normal frontend entry point only when:

- UI and agent operations both agree with GitHub/runtime truth;
- staging and production successes always contain exact runtime and complete
  baseline E2E evidence;
- batching, mixed targets, stale heads, failure recovery, retry, cancel, page
  reload, and polling repair have been exercised;
- no duplicate mutation, unexplained drift, hidden partial merge, or
  colleague-blocking behavior remains;
- canonical manual staging and production remain documented and usable; and
- a frontend burn-in period and establishment decision are recorded.

Frontend Release Bus cleanup begins only after this gate. Backend support and
backend Release Bus cleanup require a separate later decision.
