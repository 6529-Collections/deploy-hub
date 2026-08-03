# ADR 0011: Deploy Hub is a portable static app

Status: Accepted

Date: 2026-08-03

Supersedes ADR 0003's backend-proxy requirement and the backend-owned API
boundary previously recorded in ADRs 0009 and 0010.

## Context

The backend proxy was discussed only as one possible way to host the static
page. It was incorrectly promoted into a required Deploy Hub runtime and led to
an unauthorized implementation in `6529seize-backend`.

Deploy Hub should remain independently hostable and should use the GitHub
credentials that humans and Codex already possess.

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

- Task 7 is browser GitHub authentication in this repository.
- The mistaken backend PR #1900 was closed unmerged and its remote branch was
  deleted.
- Hosting and Deploy Hub releases are independent of backend deployments.
- Browser-token security relies on a first-party static bundle, strict CSP, no
  third-party scripts, safe DOM APIs, token redaction, and a visible forget
  action.
- A server component may be considered only after a concrete requirement is
  demonstrated and explicitly approved.
