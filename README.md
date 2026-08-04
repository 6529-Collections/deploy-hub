# Deploy Hub

Deploy Hub is the frontend deployment control and observability UI for 6529.

The current project is deliberately frontend-only. The goal is to prove a
small, reliable path from an exact frontend pull request to staging or
production before considering backend support.

## Required outcomes

- A human or Codex can request `Take this frontend PR to staging` or
  `Take this frontend PR to production`.
- The request is bound to the exact PR-head SHA and explicit final target.
- The PR shows live target and deployment progress with links to authoritative
  GitHub Actions evidence.
- The static UI updates operations, waiting, failures, validation, and history
  without a browser refresh.
- Existing frontend staging, production, E2E, CI-notification, and release-note
  implementations remain canonical.
- Independent staging and production work use their existing GitHub Actions
  concurrency lanes.
- Same-target requests may batch. Different final targets remain separate.
- A failed staging batch is reduced to useful per-PR outcomes by a bounded
  workflow path; no agent polling or Deploy Hub service is required.

## Product boundary

Deploy Hub is a portable static app in this repository. Humans use their
existing GitHub token directly in the browser. Codex uses its existing GitHub
authentication through one small command or skill.

GitHub and the frontend repository remain the mutation and execution
authority. Deploy Hub has no backend, proxy API, Lambda, database, custom queue,
callback service, SSE, or WebSocket.

The frontend repository will own the thin operation workflow and continue to
own the canonical deployment and E2E workflows. This repository owns the UI,
frontend operation contract, agent entry point, documentation, and shadow
fixtures.

Task 1 introduces that frontend operation workflow in dormant shadow-only form.
It cannot deploy or mutate refs. Task 3 later extends the proven workflow to
real staging while preserving the existing manual path.

## Current state

- The static UI and direct GitHub-token authentication are implemented. The UI
  freezes exact PR heads, submits the fixed operation contract, refreshes
  GitHub truth every five seconds, and exposes Stop and tracked staging removal.
- The supplied Deploy Hub mark and deterministic icon/favicon sizes are saved
  under `ui/assets/brand/` and integrated into the static UI.
- The FE-only requirements, architecture, flows, and rollout strategy are the
  active design.
- The static page contains no repository or environment authority of its own.
  Live workflow dispatch remains unavailable until the pending frontend PR is
  deliberately merged for controlled integration.
- Frontend PR
  [#3586](https://github.com/6529-Collections/6529seize-frontend/pull/3586)
  contains the open, in-review workflow implementation and staging removal
  flow; it is not merged or active.
- Release Bus is OFF. Canonical manual frontend workflows remain the fallback.

## Active documentation

- [Current status](STATUS.md)
- [Implementation tracker](TODO.md)
- [Frontend requirements](docs/frontend/requirements.md)
- [Frontend architecture](docs/frontend/architecture.md)
- [Frontend flows](docs/frontend/flows/)
- [Testing and rollout](docs/frontend/testing-and-rollout.md)
- [Brand assets](ui/assets/brand/README.md)
- [Planning changelog](CHANGELOG.md)

The original broad frontend/backend plan is preserved under
[`archive/original-cross-repo-plan/`](archive/original-cross-repo-plan/) for
reference only. It is not an active requirements or task source.

## Development

Rule 1 is KISS: Keep It Simple, Silly.

```bash
npm install --ignore-scripts
npm run check
```

The project uses plain HTML, CSS, JavaScript, Node unit tests, and read-only
credentialless CI. There is no local or hosted Deploy Hub server.

During the current private bootstrap, audited changes are pushed directly to
`main` after fetching and checking `origin/main`. Protected main must be
reconsidered before adding deployment mutation capability or another write
actor.
