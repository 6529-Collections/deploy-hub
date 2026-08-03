# Planning Changelog

## 2026-08-03

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
