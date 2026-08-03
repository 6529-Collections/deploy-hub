# ADR 0009: Reuse GitHub token authentication

Status: Accepted

Date: 2026-08-03

Supersedes the current-authentication and live-transport decisions in ADR 0007
and the GitHub-App authentication choice in ADR 0002.

## Context

The existing deployment UIs at `/deploy/ui` and `/deploy/ui/bus` already use a
small working authentication path:

1. the browser sends a GitHub token as a Bearer credential;
2. the backend resolves the token through GitHub's `/user` endpoint;
3. the backend checks the resolved GitHub login against the deployment operator
   policy; and
4. the same caller credential performs allowed GitHub reads and mutations.

Codex tasks already have GitHub authentication for repository reads, pushes,
and workflow operations. Replacing this proven path with wallet-backed OAuth,
PKCE, a new authorization server, rotating refresh grants, browser sessions, a
GitHub App private-key broker, and a new authenticated WebSocket protocol would
add several security-critical systems before Deploy Hub has executed one
deployment.

The UI still needs automatic updates, but that requirement does not imply a
push transport. Existing deployment UI polling proves the simpler mechanism.

## Decision

- Humans and Codex callers authenticate to Deploy Hub HTTP endpoints with their
  existing GitHub token in `Authorization: Bearer <token>`.
- The backend resolves the token to a GitHub login, checks required repository
  access, and enforces the existing organization/operator policy on every
  protected request.
- The authenticated GitHub login is the deployment authority and GitHub
  executor. A Codex task ID remains requester/correlation metadata, not an
  authentication credential.
- Staging and production are separate explicit actions. Production requires
  current operator authorization and exact production intent on that request;
  staging history never grants production authority.
- The UI follows the current internal-tool model: its static shell contains no
  secret, the user supplies a GitHub token, and operational API calls carry the
  Bearer token. The token may be retained in browser `localStorage` for the MVP
  as it is today, with a visible forget action.
- The static UI uses no third-party scripts. Tokens and Authorization headers
  are never written to logs, contracts, Git state, Check/commit status output,
  URLs, or error payloads.
- Codex uses its existing GitHub authentication through a small HTTP client or
  CLI helper. Deploy Hub does not implement an OAuth or MCP authorization
  server for the MVP.
- The UI starts with authenticated polling no slower than every five seconds.
  WebSockets, SSE, event cursors, one-time tickets, and resynchronization
  protocols are added only if measured polling behavior fails the UX or GitHub
  rate-limit requirement.
- Deploy Hub dispatches and observes the existing canonical workflows using the
  caller's GitHub authority. It does not redesign canonical workflow-to-AWS
  authentication or add callback credentials in the MVP; GitHub workflow/run
  state is polled when callback-free observation is sufficient.
- A GitHub App is not part of caller authentication. If a later PR-feedback
  implementation proves that rich Check Run writes require a GitHub App or a
  suitable fine-grained user token is unavailable, that narrow capability gets
  its own decision and permission gate. Commit statuses and workflow checks
  must be assessed first.

## Authorization rules

- Identity is always derived server-side from the GitHub token.
- Caller-supplied login, requester, contributor, task, branch, PR, or workflow
  metadata never grants permission.
- Read and mutation routes enforce the smallest existing GitHub and operator
  permission that the route needs.
- Every mutation rechecks the exact SHA, target environment, and current
  operator authorization immediately before dispatch or ref update.
- Cancel and retry repeat the same authorization checks.
- Revoked, expired, inaccessible, or insufficiently scoped tokens fail with
  `401` or `403` before any mutation.

## Consequences

- Task 7 reuses backend code and operating practice that already exist.
- No OAuth client, authorization server, refresh-token database, wallet role
  mapping, session/CSRF subsystem, App private key, or token broker is needed.
- GitHub access revocation immediately removes Deploy Hub access.
- Activity is attributable to the GitHub identity whose credential performed
  it.
- Browser token storage retains the existing XSS exposure. The MVP accepts that
  internal-tool tradeoff and limits it with a static first-party UI, strict CSP,
  no third-party code, safe DOM rendering, no token logging, and a forget
  control.
- A later move to a GitHub App or another identity system requires evidence of
  a concrete limitation, not a general preference for a theoretically cleaner
  architecture.

## Revisit triggers

Revisit only if at least one of these is demonstrated:

- required GitHub operations cannot be performed with the approved human/agent
  token model;
- token handling becomes an actual operational or security incident source;
- the tool must support users who do not already have approved GitHub access;
- an organization-owned non-human executor becomes a business requirement; or
- polling cannot meet the no-refresh UX within an acceptable GitHub API budget.
