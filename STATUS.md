# Deploy Hub Planning Status

Last updated: 2026-08-03

## Phase

Executable skeleton blocked before code by unavailable private-repository
`main` protection.

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
- Wallet-backed OAuth 2.1/PKCE authenticates Codex MCP calls; task IDs are
  correlation only. Browsers use short-lived `HttpOnly` sessions plus CSRF and
  one-time WebSocket tickets and never hold GitHub credentials.
- Canonical workflow callbacks and AWS role assumption use short-lived GitHub
  OIDC identity; no shared Release Bus callback bearer or long-lived AWS key is
  introduced.
- Deployment health and exact-version proof are always required. Every staging
  and production outcome requires mandatory baseline read-only
  E2E bound to one exact environment snapshot. Coordinated deployments share
  one validation result after all intended components are deployed; deeper
  feature-specific and cross-system validation remains risk-based.
- Canonical workflows and the existing backend retain CI deployment posting,
  exact initiator/contributor attribution, and production release-note
  automation. Deploy Hub supplies immutable request/authority context and
  observes their non-gating outcomes instead of rebuilding that pipeline.
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
  while Deploy Hub is developed and tested. They currently still obtain
  readiness from Release Bus even though its lanes are OFF.
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
- An authenticated check on 2026-08-03 found no existing protection and GitHub
  returned HTTP 403 for both branch protection and repository rulesets, asking
  for a plan upgrade or a public repository. The repository remains private,
  and no executable code or Actions were added.

## Current documents

- Requirements v1.0 agreed.
- Target architecture and agent-to-production sequence agreed at v1.0.
- Migration and test strategies updated with mandatory environment-snapshot
  E2E gates.
- Current staging and production E2E workflows, coverage, integration gaps, and
  recent GitHub Actions durations analyzed in `docs/e2e-validation-analysis.md`.
- Task 1 completed in `docs/current-system-inventory.md` against exact frontend
  and backend `main` SHAs plus the authoritative live Release Bus status.
- Both Release Bus lanes are confirmed OFF, but every canonical manual workflow
  still depends on Release Bus manual readiness; this boundary must be
  generalized before Release Bus removal.
- Current backend manual deployments are globally serialized per environment,
  and exact Lambda/API runtime proof is Release Bus-conditioned rather than
  generic. Both are explicit adapter requirements.
- Mandatory environment-snapshot E2E accepted in ADR 0004.
- Source task `019faa0e-272b-7f62-843a-79fffb815a7e`, open backend PR #1869,
  and open frontend PR #3504 analyzed as the foundation for deployment
  communications.
- Deployment communications boundary accepted in ADR 0005 and documented in
  `docs/deployment-communications-analysis.md`.
- Root implementation tracker contains stable Tasks 0–25; Tasks 0–3 are
  complete, Task 4 is next, and Task 25 owns the cross-cutting communications
  integration.
- Task 2 completed the versioned deployment, validation, cancel, retry, ledger,
  task-event, communication-outcome, and safe-error schemas with normative
  fixtures under `docs/contracts/`.
- ADR 0006 accepts one protected `refs/heads/state/v1` Git ledger as durable
  authority, with GitHub Deployments and Check Runs as exact-SHA projections.
- The Task 2 completion audit compiled all 14 schemas in strict JSON Schema
  2020-12 mode, validated 12 schema-backed objects across nine fixtures, and
  proved six key unsafe cases fail closed.
- Task 3 completed the wallet-backed OAuth/MCP and browser-session model,
  role/scope policy, GitHub App token-broker and rollout permission matrix,
  GitHub OIDC workflow/AWS trust, secured WebSocket transport, secret
  boundaries, and 26-case threat review. No identity, permission, credential,
  workflow, or environment authority was created.
- `1a-deploy-hub` frontend shadow-branch design documented across requirements,
  architecture, migration, and testing.
- Initial architecture and MVP foundation decisions recorded.
- Four Mermaid diagrams saved as standalone source files, including the
  security trust boundaries.
- Original handoff documents copied into `references/`.

## Resolved MVP decisions

1. GitHub-native durable records first; no MVP database or S3 request ledger.
2. Canonical manual workflows are the fallback; Release Bus remains OFF.
3. Health, exact-version proof, and baseline environment-snapshot E2E are
   universal; deeper feature-specific validation is risk-based.
4. Use an organization-owned, least-privilege GitHub App with read-only shadow
   permissions first.
5. Serve the static UI from the exact current `deploy-hub/main` commit through
   the authenticated backend proxy. Deliver operational changes through the
   existing authenticated WebSocket runtime with automatic reconnect,
   resynchronization, and polling fallback.
6. Keep automatic rollback out of MVP; redeploy a known-good exact version
   explicitly through canonical workflows.
7. Reuse repository-owned CI posting and backend production release-note
   automation. Treat requester, authenticated Deploy Hub authority, and exact
   contributors separately; surface communication failures without making them
   environment-mutation or deployment/E2E gates.
8. Use one protected non-default `state/v1` Git branch for immutable requests,
   append-only ledger events, deterministic queue order, replayable snapshots,
   cancellation/retry intent, and restart recovery. GitHub Deployments and
   Check Runs remain visible projections, not the durable authority.
9. Use wallet-backed OAuth for Codex, short-lived browser sessions, one
   organization GitHub App with per-operation narrowed installation tokens,
   GitHub OIDC for workflows/AWS, and the existing WebSocket stack with
   snapshot/polling recovery.

## Remaining security and implementation work

- Task 4 is blocked at its first gate: the current GitHub plan does not expose
  branch protection or rulesets for this private repository. A plan that
  supports private-repository protection is the recommended resolution; making
  the repository public or weakening the safety gate requires an explicit
  separate decision.
- Later rollout tasks must provide the phase-specific permission snapshots,
  denied-operation proofs, OAuth/session/webhook/OIDC tests, ruleset and IAM
  evidence, secret-canary scans, and owner approvals required by
  `docs/security-model.md`; Task 3 defines these gates but does not create or
  prove live credentials.
- Reinspect backend PR #1869 and frontend PR #3504 when they change or merge;
  at the Task 1 snapshot they remain open and unmerged, so repository `main`
  still has the older communication contract.
- Define how asynchronous release-note outcomes become machine-visible to
  Deploy Hub without introducing a second durable release-note state store.

## Next recommended work

Enable branch protection/rulesets for the private repository, then resume Task
4: protect `main`, create `agent-prxt/executable-skeleton`, choose the minimal
runtime/package structure, and build the credentialless application/test
skeleton through a ready-for-review pull request. Do not create a GitHub App,
OAuth client, state branch, deployment authority, AWS role, or live credential.
