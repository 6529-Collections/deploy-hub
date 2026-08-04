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
- The browser UI is a portable static app; it authenticates and operates
  directly through GitHub using the user's existing token.
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

**Portable static app; Task 4 browser authentication is complete.**

This repository contains the entire Deploy Hub implementation: a plain static
UI that talks directly to GitHub and can be hosted anywhere.

This repository currently contains read-only GitHub-token authentication but no
GitHub App, OAuth client, AWS credential, repository environment, staging
access, production access, state branch, or deployment implementation.

ADR 0005 makes Deploy Hub a portable static app. The browser stores the user's
GitHub token locally, calls GitHub directly, and has no Deploy Hub server,
backend dependency, OAuth system, or GitHub App broker.

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

The project uses Node.js 22.17.1 for formatting, lint, and browser-module unit
tests. `npm run check` validates the static app and repository configuration.
There is no server or production runtime.

Project boundaries:

```text
ui/             plain static UI files
docs/           requirements, architecture, decisions, migration, and testing
.github/        credentialless read-only CI
```

During the current private static-app bootstrap, changes are pushed directly to
`main` after fetching and checking `origin/main`. Protected-main/PR workflow
must be reconsidered before GitHub mutation capability, deployment authority,
repository secrets, or another write actor is introduced.

## Safety boundary

Task 4 authentication is read-only: it can resolve GitHub identity and operator
membership but cannot dispatch workflows, update refs, or reach AWS. Later
mutation capabilities remain gated by their own tasks and exact allowlists.

`1a-deploy-hub` is only an optional credentialless shadow trigger if real
branch-trigger behavior must be tested. It is not a second staging lane and
does not exist yet.

## Resuming work

Read [AGENTS.md](AGENTS.md), [STATUS.md](STATUS.md), and [TODO.md](TODO.md)
before making changes.
Material requirements, decisions, diagrams, and next steps must be saved in
this repository rather than left only in a Codex conversation.
