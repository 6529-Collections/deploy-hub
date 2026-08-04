# ADR 0005: Deploy Hub Is a Portable Static App

Status: Accepted

Date: 2026-08-03

## Context

Deploy Hub must be independently hostable and use the GitHub credentials that
humans and Codex already possess. Hosting the page must not create another
deployment backend or source of operational state.

## Decision

- All Deploy Hub implementation lives in this repository.
- Deploy Hub is plain static HTML, CSS, and JavaScript that can be hosted by any
  ordinary static-file host.
- The browser stores the user's GitHub token in its own `localStorage`, sends it
  directly to `api.github.com`, resolves `/user`, and verifies current
  organization/operator membership.
- Later browser actions call fixed GitHub repositories, workflows, refs, and
  inputs directly through the GitHub API. Each action verifies the permission
  it needs and remains constrained by GitHub's own authorization.
- Codex uses its existing GitHub authentication directly. It does not obtain a
  Deploy Hub token or call a Deploy Hub server.
- GitHub workflow runs, checks, artifacts, and repository-owned runtime proof
  are the observable state. The UI polls GitHub directly.
- Hosting through `api.6529.io` remains an optional static-file choice only. It
  must not be required for authentication, operation, state, or deployment.
- No Deploy Hub backend, Lambda, API proxy, database, ledger, queue, scheduler,
  reconciler, OAuth service, GitHub App broker, callback service, SSE, or
  WebSocket is introduced.

## Consequences

- Hosting and Deploy Hub releases are independent of backend deployments.
- Browser-token security relies on a first-party static bundle, strict CSP, no
  third-party scripts, safe DOM APIs, token redaction, and a visible forget
  action.
- A server component may be considered only after a concrete requirement is
  demonstrated and explicitly approved.
