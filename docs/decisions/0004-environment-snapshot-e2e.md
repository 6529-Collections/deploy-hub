# ADR 0004: Environment-Snapshot E2E Validation

Status: Accepted

Date: 2026-08-03

## Context

The repositories already contain broad staging and production-safe Playwright
suites, but their orchestration is uneven and coupled to Release Bus. Automatic
staging E2E follows frontend deployment only, backend-only staging lacks the
same automatic binding, and production E2E requires Release Bus train and
manifest inputs.

E2E validates the combined runtime environment observed by a user. Treating it
as evidence for only one repository SHA is incorrect when frontend and
independently deployed backend services can run different exact versions.

Recent successful complete workflows averaged about seven minutes for staging
and four minutes for production. That is short enough for mandatory baseline
validation without recreating a release train or holding unrelated work for the
whole release lifecycle.

## Decision

Every requested staging and production outcome requires terminal successful
baseline read-only E2E after deployment health and exact-version proof.

Deploy Hub records a small exact validation identity containing the environment
snapshot, linked deployment request IDs, test tooling SHA, pack policy,
requester, and originating task. It dispatches repository-owned E2E workflows,
observes their GitHub result and evidence, and publishes progress. Deploy Hub
does not own or copy Playwright implementation.

For coordinated frontend/backend work, baseline E2E runs once after all
intended components are deployed and links the same result to every deployment
request. The environment snapshot records the frontend runtime SHA and backend
runtime versions by service.

Deploy Hub does not add an environment mutation lock. The workflow records the
exact snapshot before and after E2E. If another deployment changes that
snapshot, validation is stale and can be rerun without blocking colleagues.

The current full 12-pack staging read-only inventory and full 11-pack
production-safe inventory are the initial mandatory baselines. Deeper
feature-specific, authenticated, mutating, and cross-system validation remains
risk-based and owned by the initiating Codex task.

## Failure semantics

- Staging E2E failure means the environment was deployed but validation failed;
  that exact result cannot progress to production.
- Production E2E failure means production was already mutated. Later production
  mutation is blocked until exact reconciliation, explicit acceptance, or a
  known-good exact redeployment.
- Retryable infrastructure/setup failure may retry the same validation identity
  within a bounded policy.
- Product-test failure does not auto-retry into success.
- Staging and production validation ownership remain independent.

## Consequences

- A validation record is not a release train: it does not discover candidates,
  claim work, compose branches, or progress environments.
- The E2E workflows need generic validation inputs and environment-snapshot
  evidence instead of Release Bus train/manifest authorization and callbacks.
- Backend-only and coordinated staging validation become first-class paths.
- An operation may be visibly `deployed but validating` or `deployed but
  validation failed`; the UI and PR checks must not collapse deployment and
  validation into an ambiguous success/failure label.
- GitHub workflow state and snapshot drift remain visible without a custom
  cross-repository lock.
