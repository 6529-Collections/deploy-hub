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
- GitHub Check Runs provide real-time pull-request feedback.
- The browser UI is served from the exact current `deploy-hub/main` commit
  through the authenticated backend proxy.
- New deployments, queue changes, progress, and results appear in an open UI
  automatically without manual browser refresh.
- Every staging and production outcome passes the full baseline read-only E2E
  suite against an unchanged exact environment snapshot.
- Canonical workflows retain repository-owned CI deployment posts and
  production release-note automation with exact, operation-scoped attribution;
  Deploy Hub observes those non-gating outcomes instead of duplicating them.
- Frontend and backend deployment capacity is independent; baseline E2E blocks
  mutation only to the environment being validated for its short test window.

## Current status

**Credentialless executable skeleton.**

Task 4 establishes a minimal Node/TypeScript package, read-only status API,
disabled adapter boundaries, static UI shell, tests, and credentialless CI. It
contains no GitHub App, OAuth client, AWS credential, repository environment,
staging access, production access, state branch, or deployment implementation.

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
- [Control-plane contracts and fixtures](docs/contracts/README.md)
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

The project uses Node.js 22.17.1. `npm run check` runs formatting verification,
lint, type checking, build, and unit tests. `npm start` runs the optional
loopback-only status server after `npm run build`; it has no deployment
operations.

Project boundaries:

```text
src/api/       read-only HTTP boundary
src/domain/    dependency-free domain values
src/adapters/  deployment adapter boundary, disabled in Task 4
src/github/    GitHub boundary, disabled in Task 4
src/config/    offline-only configuration
ui/            plain static UI files
test/          Node built-in unit tests
```

During the current credentialless bootstrap, changes are pushed directly to
`main` after fetching and checking `origin/main`. Protected-main/PR workflow
must be reconsidered before any credential, live permission, deployment
authority, or additional write actor is introduced.

## Safety boundary

The executable skeleton is physically incapable of changing `1a-staging`,
`main`, shared staging, production, or AWS infrastructure. Task 5 will add only
deterministic fake adapters.

The proposed frontend shadow integration branch is `1a-deploy-hub`. It does not
exist yet and will not be created until its credentialless workflow contract is
reviewed and accepted.

## Resuming work

Read [AGENTS.md](AGENTS.md), [STATUS.md](STATUS.md), and [TODO.md](TODO.md)
before making changes.
Material requirements, decisions, diagrams, and next steps must be saved in
this repository rather than left only in a Codex conversation.
