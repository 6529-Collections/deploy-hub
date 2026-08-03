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

## Current documents

- Requirements v0.1 drafted.
- Target architecture and agent-to-production sequence drafted.
- Migration and test strategies drafted.
- `1a-deploy-hub` frontend shadow-branch design documented across requirements,
  architecture, migration, and testing.
- Initial architecture decision recorded.
- Three Mermaid diagrams saved as standalone source files.
- Original handoff documents copied into `references/`.

## Open decisions

1. Durable request ledger: GitHub-native records only or GitHub plus minimal S3
   request objects.
2. Confirm the exact authoritative current OFF/manual-ownership state and prove
   that all canonical manual workflows remain usable without re-enabling
   Release Bus.
3. Required staging validation policy for frontend-only, backend-only, and
   coordinated changes.
4. Authentication model for the agent-facing API and cross-repository Check
   Runs.
5. Static UI hosting and authenticated read access.
6. Whether automatic component rollback is required for MVP or remains a later
   repo-owned capability.

## Next recommended work

Turn `requirements.md` into an agreed v1 specification by resolving the six
open decisions above. After that, inventory the exact changes required in the
frontend and backend canonical workflows before any live migration action.
