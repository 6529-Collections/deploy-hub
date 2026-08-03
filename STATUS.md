# Deploy Hub Planning Status

Last updated: 2026-08-03

## Phase

Initial specification and architecture definition.

## Accepted direction

- Build Deploy Hub as a new system rather than iterating Release Bus.
- A Codex task owns the end-to-end feature lifecycle.
- Deploy Hub owns one exact deployment operation from acceptance to terminal
  reporting.
- Repositories retain their canonical build and deployment workflows.
- Frontend and backend deployment capacity is independent.
- GitHub Check Runs provide real-time PR feedback.
- A dedicated operational UI is mandatory.
- The first UI version is stored on `deploy-hub/main` and served through an
  authenticated backend proxy from one resolved exact commit SHA.
- The operational UI updates deployments, queues, and blockers automatically;
  users never refresh the browser to obtain current state.
- GitHub-native records are the MVP durable evidence; no database or S3 request
  ledger is introduced without demonstrated need.
- An organization-owned GitHub App provides least-privilege authentication,
  beginning with a physically read-only shadow installation.
- Deployment health and exact-version proof are always required. Targeted
  staging validation is normal; full cross-system E2E is risk- or policy-based.
- Every staging and production outcome requires mandatory baseline read-only
  E2E bound to one exact environment snapshot. Coordinated deployments share
  one validation result after all intended components are deployed; deeper
  feature-specific and cross-system validation remains risk-based.
- MVP rollback is an explicit agent-guided or manual exact-version redeployment
  through the canonical repository workflow.
- Release Bus is already OFF for both staging and production and is not
  expected to be re-enabled.
- Release Bus code and infrastructure remain in place during Deploy Hub
  development and burn-in, then are cleaned up as explicitly tracked technical
  debt after Deploy Hub proves itself.

## Current operational baseline

- Release Bus is OFF for staging and production.
- Re-enabling Release Bus is not part of the intended migration or fallback.
- Existing manual/canonical repository workflows are the operational fallback
  while Deploy Hub is developed and tested.
- Deploy Hub testing must begin offline and read-only, then use isolated
  execution before any controlled shared-staging canary.
- Frontend shadow validation will use an explicitly opt-in `1a-deploy-hub`
  integration branch with a credentialless workflow that cannot mutate shared
  environments.

## Current repository workflow

- The repository is private and specification-only. Documentation changes may
  be committed and pushed directly to `main` during this phase.
- Before executable application code, GitHub Actions, permissions,
  credentials, or deployment authority are added, protect `main` and use
  task-owned branches with ready-for-review pull requests.

## Current documents

- Requirements v1.0 agreed.
- Target architecture and agent-to-production sequence agreed at v1.0.
- Migration and test strategies updated with mandatory environment-snapshot
  E2E gates.
- Current staging and production E2E workflows, coverage, integration gaps, and
  recent GitHub Actions durations analyzed in `docs/e2e-validation-analysis.md`.
- Mandatory environment-snapshot E2E accepted in ADR 0004.
- Root implementation tracker created in `TODO.md`; Task 1 is the next task.
- `1a-deploy-hub` frontend shadow-branch design documented across requirements,
  architecture, migration, and testing.
- Initial architecture and MVP foundation decisions recorded.
- Three Mermaid diagrams saved as standalone source files.
- Original handoff documents copied into `references/`.

## Resolved MVP decisions

1. GitHub-native durable records first; no MVP database or S3 request ledger.
2. Canonical manual workflows are the fallback; Release Bus remains OFF.
3. Health and exact-version proof are universal; further validation is
   risk-based.
4. Use an organization-owned, least-privilege GitHub App with read-only shadow
   permissions first.
5. Serve the static UI from the exact current `deploy-hub/main` commit through
   the authenticated backend proxy. Deliver operational changes through a live
   event stream with automatic reconnect, resynchronization, and polling
   fallback.
6. Keep automatic rollback out of MVP; redeploy a known-good exact version
   explicitly through canonical workflows.

## Remaining verification work

- Confirm the exact authoritative current OFF/manual-ownership state and prove
  that all canonical manual workflows remain usable without re-enabling
  Release Bus.
- Verify that the existing backend serving stack can support the preferred
  server-sent event channel; preserve the bounded automatic-polling fallback
  regardless.
- Define the exact GitHub-native representation for waiting order and
  idempotency during implementation design.

## Next recommended work

Execute Task 1 in `TODO.md`: inventory and verify the dormant Release Bus
baseline, all four canonical deployment paths, both E2E workflows, and the
existing backend capabilities needed by Deploy Hub. Make no live migration
change during the inventory.
