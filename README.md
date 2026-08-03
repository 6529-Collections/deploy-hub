# Deploy Hub

Deploy Hub is the proposed agent-oriented deployment control and observability
layer for 6529.

The intended operating model is:

- A Codex task owns the feature lifecycle from implementation through the
  environment explicitly requested by the developer.
- Deploy Hub owns one exact deployment operation from acceptance through
  terminal reporting.
- Frontend and backend repositories retain ownership of their canonical build
  and deployment workflows.
- GitHub Check Runs provide real-time pull-request feedback.
- The browser UI is served from the exact current `deploy-hub/main` commit
  through the authenticated backend proxy.
- New deployments, queue changes, progress, and results appear in an open UI
  automatically without manual browser refresh.
- Frontend and backend deployment capacity is independent except during an
  explicitly protected shared-integration validation window.

## Current status

**Specification only.**

This repository currently contains no Deploy Hub implementation, executable
GitHub Actions, AWS credentials, GitHub App, repository environments, staging
access, or production access.

Release Bus is currently OFF for both staging and production and is not
expected to be re-enabled. Existing manual and canonical repository workflows
remain the operational deployment path while Deploy Hub is designed and tested.

## Documentation

- [Current status](STATUS.md)
- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [Migration plan](docs/migration-plan.md)
- [Testing strategy](docs/testing-strategy.md)
- [Architecture decisions](docs/decisions/)
- [Saved diagrams](docs/diagrams/)
- [Original handoff references](docs/references/)
- [Planning changelog](CHANGELOG.md)

## Safety boundary

The first executable milestone will use fake adapters and credentialless shadow
behavior. It must remain physically incapable of changing `1a-staging`, `main`,
shared staging, production, or AWS infrastructure.

The proposed frontend shadow integration branch is `1a-deploy-hub`. It does not
exist yet and will not be created until its credentialless workflow contract is
reviewed and accepted.

## Resuming work

Read [AGENTS.md](AGENTS.md) and [STATUS.md](STATUS.md) before making changes.
Material requirements, decisions, diagrams, and next steps must be saved in
this repository rather than left only in a Codex conversation.
