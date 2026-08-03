# Planning Changelog

## 2026-08-03

- Started Task 2 contract definition after Task 1 passed its acceptance audit.
- Completed Task 1 with an exact current-system inventory covering live
  Release Bus OFF state, all four canonical deploy paths, both E2E workflows,
  deployment communications, backend hosting/auth/realtime capabilities, and
  the per-file migration change map.
- Confirmed the critical migration ordering constraint: Release Bus lanes are
  OFF, but frontend and backend canonical manual workflows still require its
  manual-readiness API; cleanup cannot precede a proven generic replacement.
- Confirmed backend manual deploys are globally serialized per environment and
  that strong backend exact-runtime proof is currently Release Bus-conditioned.
- Re-inspected backend PR #1869 and frontend PR #3504 at their exact current
  heads; both remain open and unmerged with no GitHub Deployment records for
  those SHAs, so their stronger attribution/outcome behavior is not on `main`.
- Inspected source task `019faa0e-272b-7f62-843a-79fffb815a7e` plus open backend
  PR #1869 and frontend PR #3504, capturing their CI-post attribution and
  production release-note contracts as unmerged implementation evidence.
- Accepted ADR 0005: Deploy Hub reuses repository-owned notification and
  backend release-note automation, supplies immutable authenticated operation
  context, and observes communication outcomes without duplicating the
  generator or making publication a deployment gate.
- Added deployment-communications analysis covering authority/requester/
  contributor separation, exact evidence, bounded attribution, asynchronous
  outcomes, deduplication, same-SHA and unsafe-range behavior, multi-service
  grouping, and recovery.
- Added stable Task 25 for deployment communications, attribution, and
  release-note integration; updated Tasks 0–3, 5, 9, 11, and 18–24 with the
  cross-cutting acceptance criteria and retained Task 1 as the next task.
- Updated the saved architecture diagrams, migration plan, and testing strategy
  to show the existing communications pipeline beside—not inside—the Deploy
  Hub deployment and validation success path.
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
