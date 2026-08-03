# ADR 0005: Reuse Repository Deployment Communications

Status: Accepted

Date: 2026-08-03

## Context

Backend PR #1869 and frontend PR #3504 are establishing a cross-repository
pipeline for exact deployment notifications, initiator and contributor
attribution, and asynchronous production release notes. Building equivalent
logic inside Deploy Hub would duplicate security-sensitive evidence
validation, publication deduplication, and release-note behavior.

Deploy Hub still needs these outcomes in its PR feedback, UI, audit history,
and agent-facing status. It must preserve the authenticated GitHub operator and
must not mislabel that person as Release Train.

## Decision

Deploy Hub reuses the repository-owned notifier and existing backend CI-alert
and release-note pipeline.

Deploy Hub supplies immutable request and deployment context to canonical
repository workflows. Those workflows collect and validate operation-scoped
contributor evidence and submit the notification. The existing backend owns CI
drop rendering, production-only release-note eligibility, asynchronous queueing
and generation, deduplication, and publication.

Deployment authority, requester, and contributors remain separate identities.
The GitHub login resolved from the caller's Bearer token is the authenticated
authority and workflow executor. `Deploy Hub` is operation origin, not a fake
person or separate authentication identity. Caller-supplied train identifiers
or contributor names cannot relabel an operation or substitute for immutable
evidence.

Deploy Hub observes and links communication milestones and failures. CI-drop or
release-note failure is visible and recoverable but does not hold an environment
lock, undo a healthy deployment, or replace health, exact-version, and E2E as
the deployment success gates.

## Consequences

- Deploy Hub does not own release-note content generation or publication.
- Repository adapters must preserve enough immutable context for exact
  attribution, service scoping, deduplication, and safe retries.
- Staging generates deployment notifications but remains release-note
  ineligible.
- Production release-note processing remains asynchronous and non-gating.
- PR feedback, request lookup, audit history, and the UI expose the smallest
  available communication summary separately from deployment and validation
  state.
- Shadow workflows must use fake or suppressed communication sinks and cannot
  publish real drops or release notes.
- Release Bus-specific authority and workflow identities can be removed only
  after canonical manual and Deploy Hub identities are proven.
