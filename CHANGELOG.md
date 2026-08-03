# Planning Changelog

## 2026-08-03

- Finalized the v1 requirements and target architecture, including the exact
  deployment-versus-validation boundary and terminal failure semantics.
- Accepted mandatory full baseline E2E for every staging and production
  outcome in ADR 0004: 12 current staging packs and 11 current
  production-safe packs bound to an unchanged exact environment snapshot.
- Updated the agent-to-production and target-architecture diagrams so neither
  environment reports success before its snapshot-bound E2E result.
- Expanded migration and testing plans for frontend-only, backend-only, and
  coordinated validation, snapshot drift, product failure, infrastructure
  retry, and environment-scoped locking.
- Added the root `TODO.md` tracker with stable Tasks 0–24, acceptance criteria,
  durable evidence rules, Task 0 completed, and Task 1 designated as next.
- Allowed direct documentation pushes to `main` only during the current private,
  specification-only phase; protected-main and ready-PR workflow becomes a
  prerequisite before executable code, Actions, credentials, or deployment
  authority.
- Analyzed the existing staging and production Playwright workflows, pack
  coverage, triggers, Release Bus coupling, failure behavior, and recent GitHub
  Actions timing history.
- Proposed mandatory baseline read-only E2E for every staging and production
  outcome, bound to an exact environment snapshot rather than a release train.
- Recorded initial observed E2E estimates of roughly seven minutes for staging
  and four minutes for production, with rolling history recommended for UI
  ETAs.
- Agreed the v1 requirements and resolved the six initial MVP decisions.
- Selected GitHub-native durable evidence, canonical manual workflow fallback,
  risk-based staging validation, a least-privilege organization GitHub App, and
  explicit exact-version redeployment instead of automatic MVP rollback.
- Selected a GitHub-backed static UI owned by `deploy-hub/main` and exposed
  through an authenticated exact-SHA backend proxy.
- Made no-refresh operational updates a hard requirement, using a live event
  stream with automatic reconnect, snapshot resynchronization, and bounded
  polling fallback.
- Added ADRs for the MVP control-plane foundations and live operational UI.
- Bootstrapped the private Deploy Hub specification repository with a clean,
  documentation-only project structure and no operational deployment
  capability.
- Recorded that Release Bus is already OFF for staging and production and is
  not expected to be re-enabled.
- Changed the migration fallback from Release Bus to the existing
  manual/canonical repository workflows.
- Added the requirement that Deploy Hub begin with permission-isolated,
  read-only shadow testing before isolated execution or shared-staging use.
- Added the `1a-deploy-hub` frontend shadow integration branch and
  credentialless workflow design, including explicit limits on what shadow
  validation can prove.

## 2026-07-31

- Created the durable Deploy Hub planning workspace.
- Added initial requirements, architecture, migration, testing, and agent
  handoff documents.
- Saved architecture, agent lifecycle, and migration Mermaid diagrams.
- Copied the original Deploy Hub and Release Bus handoff documents into stable
  local references.
- Recorded the decision to use agent-owned release lifecycles and atomic Deploy
  Hub deployment operations.
