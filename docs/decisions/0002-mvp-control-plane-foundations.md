# ADR 0002: MVP Control-Plane Foundations

Status: Accepted

Date: 2026-08-03

## Context

The first Deploy Hub specification left open the durable request store,
operational fallback, staging-validation policy, caller authentication, and
rollback scope. Leaving those choices unresolved would allow implementation to
recreate Release Bus complexity or make shadow testing unsafe.

## Decision

- Use GitHub-native records as the MVP source of durable deployment evidence.
  Do not introduce S3 request objects or a database unless implementation
  evidence proves that a required datum cannot be represented or reconstructed
  safely from GitHub.
- Keep the canonical manual repository workflows as the operational and
  break-glass fallback. Release Bus remains OFF and is not the fallback.
- Always require deployment health and exact-version proof. Normally require
  targeted, feature-specific staging validation; require full cross-system E2E
  only when policy or change risk warrants it.
- Authenticate Deploy Hub with an organization-owned GitHub App. Begin with a
  physically read-only shadow installation and add narrowly scoped write and
  workflow permissions only as each rollout phase requires them.
- For the MVP, rollback is agent-guided or manual redeployment of a known-good
  exact version through the repository-owned canonical workflow. Automatic
  component rollback remains later work until repo-owned primitives are proven
  safe.

## Consequences

- The MVP has no separate deployment-state database or S3 request ledger.
- Durable waiting, idempotency, and recovery designs must be demonstrably
  reconstructable from GitHub evidence before implementation is accepted.
- Validation is proportional to risk without allowing any deployment to claim
  success without runtime identity proof.
- Shadow permissions cannot mutate repositories, workflows, or AWS resources.
- Rollback remains explicit, attributable, and exact-version based rather than
  pretending that a multi-repository deployment is transactional.

