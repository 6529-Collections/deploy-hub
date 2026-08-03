# Deploy Hub

Deploy Hub is the proposed agent-oriented deployment control and observability
layer for 6529.

The intended operating model is:

- A Codex task owns the feature lifecycle from implementation through the
  environment explicitly requested by the developer.
- Deploy Hub owns one exact deployment or environment-snapshot validation
  operation from acceptance through terminal reporting.
- Frontend and backend repositories retain ownership of their canonical build
  and deployment workflows.
- GitHub workflow checks, commit statuses, or—only if required—a narrow Check
  Run provide current pull-request feedback.
- The secret-free browser UI shell is served from the exact current
  `deploy-hub/main` commit through the backend private-repository proxy;
  operational calls require GitHub Bearer authentication.
- New deployments, queue changes, progress, and results appear in an open UI
  automatically without manual browser refresh.
- Every staging and production outcome passes the full baseline read-only E2E
  suite against an unchanged exact environment snapshot.
- Canonical workflows retain repository-owned CI deployment posts and
  production release-note automation with exact, operation-scoped attribution;
  Deploy Hub observes those non-gating outcomes instead of duplicating them.
- Frontend and backend deployment capacity is independent; baseline E2E detects
  snapshot drift and reruns without a custom cross-repository lock.

## Current status

**Documentation and static UI foundation; Task 7 has not started.**

The rejected loopback server, callback/event model, strict ledger contracts,
and Git-ledger prototype have been removed from the active tree. Git history
and retired ADRs preserve why they were rejected. This repository contains the
plain static UI and project documentation; Task 7's authenticated HTTP API is
explicitly owned by the existing `6529seize-backend` repository.

This repository contains no live GitHub-token handling, GitHub App, OAuth
client, AWS credential, repository environment, staging access, production
access, live state branch, or deployment implementation.

ADR 0009 replaces the earlier wallet OAuth/GitHub App broker design with the
existing deployment UI's GitHub Bearer-token/operator model. The architecture
and tracker directly apply the KISS decisions; there is no separate review
process or document to interpret before Task 7.

Release Bus is currently OFF for both staging and production and is not
expected to be re-enabled. Existing manual and canonical repository workflows
remain the operational deployment path while Deploy Hub is designed and tested.

## Documentation

- [Current status](STATUS.md)
- [Implementation tracker](TODO.md)
- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [Authentication, permissions, and threat model](docs/security-model.md)
- [Migration plan](docs/migration-plan.md)
- [Testing strategy](docs/testing-strategy.md)
- [Current deployment-system inventory](docs/current-system-inventory.md)
- [E2E validation analysis](docs/e2e-validation-analysis.md)
- [Deployment communications analysis](docs/deployment-communications-analysis.md)
- [Architecture decisions](docs/decisions/)
- [Saved diagrams](docs/diagrams/)
- [Original handoff references](docs/references/)
- [Planning changelog](CHANGELOG.md)

## Development

Rule 1 is KISS: Keep It Simple, Silly.

```bash
npm install --ignore-scripts
npm run check
```

The project uses Node.js 22.17.1 for its small formatting and lint toolchain.
`npm run check` validates the static UI and repository configuration. There is
no server or production runtime in this repository.

Project boundaries:

```text
ui/             plain static UI files
docs/           requirements, architecture, decisions, migration, and testing
.github/        credentialless read-only CI
```

During the current credentialless bootstrap, changes are pushed directly to
`main` after fetching and checking `origin/main`. Protected-main/PR workflow
must be reconsidered before any credential, live permission, deployment
authority, or additional write actor is introduced.

## Safety boundary

This repository is physically incapable of changing `1a-staging`, `main`,
shared staging, production, or AWS infrastructure. It contains no API server,
deployment adapter, GitHub client, credential, or external mutation path.

`1a-deploy-hub` is only an optional credentialless shadow trigger if real
branch-trigger behavior must be tested. It is not a second staging lane and
does not exist yet.

## Resuming work

Read [AGENTS.md](AGENTS.md), [STATUS.md](STATUS.md), and [TODO.md](TODO.md)
before making changes.
Material requirements, decisions, diagrams, and next steps must be saved in
this repository rather than left only in a Codex conversation.
