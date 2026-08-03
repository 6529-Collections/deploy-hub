# ADR 0002: MVP Control-Plane Foundations

Status: Accepted

Date: 2026-08-03

Validation clarification: ADR 0004 requires the current full read-only baseline
pack inventory for every staging and production outcome. In this record,
`full cross-system E2E` means deeper authenticated, mutating, feature-specific,
or otherwise risk-selected validation beyond that universal baseline.

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
- Always require deployment health, exact-version proof, and the full baseline
  read-only environment-snapshot E2E policy for staging and production. Deeper
  authenticated, mutating, or feature-specific validation remains risk-based.
- Reuse the existing GitHub bearer-token and operator-policy authentication
  path for humans and Codex tasks, as superseded and specified by ADR 0009.
- For the MVP, rollback is agent-guided or manual redeployment of a known-good
  exact version through the repository-owned canonical workflow. Automatic
  component rollback remains later work until repo-owned primitives are proven
  safe.

## Consequences

- The MVP has no separate deployment-state database or S3 request ledger.
- ADR 0006 and repository history preserve the retired Task 6 Git-ledger
  experiment. Live MVP state comes from workflow-run/status/runtime evidence
  and canonical GitHub concurrency; no live ledger or duplicate projection is
  approved.
- Baseline snapshot E2E is universal; deeper validation is proportional to risk
  without allowing any deployment to claim success without runtime identity
  proof and unchanged-environment validation.
- Shadow execution remains credentialless or read-only and cannot mutate
  repositories, workflows, or AWS resources.
- Rollback remains explicit, attributable, and exact-version based rather than
  pretending that a multi-repository deployment is transactional.
