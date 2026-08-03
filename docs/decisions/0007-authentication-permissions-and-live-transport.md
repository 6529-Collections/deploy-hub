# ADR 0007: Use wallet-backed OAuth, scoped GitHub App tokens, OIDC workflows, and WebSockets

Status: Accepted

Date: 2026-08-03

## Context

Deploy Hub must let a developer tell a Codex task to carry work to staging or
production without pasting GitHub credentials into a browser or trusting an
unverifiable task label as deployment authority. It must also deliver live UI
updates, operate canonical GitHub workflows, and preserve a physically
read-only first shadow phase.

The current backend already has 6529 wallet/JWT authentication and an
authenticated WebSocket runtime. It does not have Deploy Hub authorization,
an SSE implementation, or a secure Deploy Hub browser session. The current
deployment UI instead accepts a user GitHub token and stores it in browser
`localStorage`; that model is explicitly rejected.

Codex supports OAuth-authenticated Streamable HTTP MCP servers, but current
public documentation does not establish a Deploy Hub-verifiable Codex task
attestation token. A task ID can therefore correlate callbacks but cannot
grant staging or production authority.

GitHub App installation tokens can be limited to selected repositories and a
permission subset and expire after one hour. GitHub Actions and AWS both
support short-lived OIDC identity, allowing workflows to avoid shared
long-lived deployment secrets.

## Decision

### Human and Codex callers

- Expose Deploy Hub agent operations as OAuth-authenticated Streamable HTTP
  MCP tools backed by the same HTTP domain contracts.
- Use OAuth 2.1 authorization code with PKCE. The authorization server resolves
  the existing 6529 wallet-authenticated profile and issues short-lived,
  audience-bound Deploy Hub access tokens plus rotating refresh tokens.
- Treat the authenticated wallet/profile as deployment authority. Treat the
  Codex task ID as requester/callback correlation only.
- Enforce scopes and server-side role policy on every tool and HTTP call. A
  production request is a separate destructive tool/action and records an
  exact request-bound production authorization.
- Do not create a generic long-lived `codex_service` bearer credential. A
  future workload identity may be added only with verifiable issuer, audience,
  subject, expiry, and task binding.

### Browser callers

- Exchange a valid wallet JWT for a short-lived, `Secure`, `HttpOnly`,
  `SameSite=Strict`, path-scoped Deploy Hub browser session.
- Require an origin check and session-bound CSRF token on every mutating HTTP
  command. Never place wallet JWTs, GitHub tokens, App tokens, or refresh tokens
  in static UI code, URLs, `localStorage`, or WebSocket query strings.
- Use a single-use, short-lived WebSocket ticket minted by an authenticated
  HTTP endpoint. The existing WebSocket runtime consumes the ticket, binds the
  connection to the profile and read scope, and never accepts operational
  subscriptions before authentication.

### GitHub and workflows

- Use one organization-owned Deploy Hub GitHub App as the visible control-plane
  executor. Its private key is held only by a server-side token broker.
- Mint a separate installation token for one repository and the minimum
  permission subset needed by one operation. No browser, Codex worker,
  workflow, or shadow worker receives the App private key.
- Begin with an App registration and installation that are themselves
  read-only. Permission upgrades require explicit organization-owner approval.
- In later phases, a shadow worker receives only a narrowed token that cannot
  dispatch Actions, update refs, or reach AWS even if the App registration has
  gained broader live permissions.
- Authenticate GitHub webhooks with HMAC-SHA256 over raw bytes and deduplicate
  by `X-GitHub-Delivery`. A webhook may advance only an existing exact request;
  it can never create authority.
- Authenticate canonical workflow callbacks to Deploy Hub with a short-lived
  GitHub OIDC token whose issuer, audience, repository ID, workflow ref/SHA,
  run ID/attempt, ref, environment, and expiry are checked against the existing
  request. Do not reuse the Release Bus workflow bearer secret.
- Use GitHub Actions OIDC for AWS. Trust policies bind the organization,
  repository, exact environment/ref subject, and audience; IAM policies bind
  environment and service resources. No Deploy Hub or repository long-lived
  AWS key is introduced.

### Live transport

- Reuse the authenticated backend WebSocket infrastructure for live state.
- HTTP remains authoritative for snapshots and commands. On connection or
  reconnect the UI obtains a fresh snapshot and resumes from a ledger cursor.
- Fall back automatically to authenticated polling at no more than five-second
  intervals. Transport failure never authorizes a command or changes state.
- Do not add SSE for MVP. It would add another unproven backend transport while
  providing no authorization or recovery property that the existing WebSocket
  plus snapshot/polling design lacks.

The complete scopes, permission phases, branch rules, secret boundaries, and
threat review are normative in `docs/security-model.md`.

## Consequences

### Positive

- A Codex task can use normal OAuth-backed MCP tools without owning a GitHub or
  AWS secret.
- The wallet-backed authority, requester task, GitHub App executor, workflow
  actor, and contributors remain separate and auditable.
- Read-only shadow is enforced by credential capability, not a software mode
  flag.
- Existing backend auth and WebSocket primitives are reused without retaining
  the unsafe pasted-GitHub-token UI.
- GitHub and AWS credentials are short-lived, scoped, and independently
  revocable.

### Costs and limits

- The backend needs an OAuth authorization surface, refresh-token rotation,
  short-lived browser sessions, CSRF protection, and a one-time WebSocket
  ticket flow. This is authentication state, not deployment state; deployment
  truth remains in the Git ledger.
- The GitHub App permission registration is a superset. The private-key broker,
  per-token permission reduction, repository rulesets, and phase-specific
  installations are all required defense layers.
- Public Codex documentation does not provide a trusted thread/task assertion
  for this design. The task reference cannot be used as authority, and terminal
  delivery must be polled or routed through a separately trusted integration.
- Production remains automated only for identities with an explicit production
  role/scope and exact production action. A broad auto-approval policy is not a
  substitute.

## Rejected alternatives

- **Pasted GitHub personal access tokens:** exposes user credentials to browser
  code and conflates GitHub identity with deployment authority.
- **One static bearer token for Codex:** long-lived, poorly attributable, hard
  to scope per environment, and unsafe for production.
- **Trusting a Codex task ID or prompt text:** useful correlation but not a
  cryptographic identity the backend can verify.
- **GitHub App user tokens as human authority:** unnecessarily couples wallet
  identity and policy to GitHub account access and still does not authenticate
  the Codex task.
- **Shared workflow callback secret:** broad replay/blast radius and weaker
  run/workflow binding than GitHub OIDC.
- **Long-lived AWS credentials:** unnecessary when canonical Actions workflows
  can assume exact environment roles using OIDC.
- **SSE for MVP:** duplicates an existing live-transport capability and adds a
  new authentication/reconnect implementation.
- **WebSocket-only truth:** connections are ephemeral; snapshots, the Git
  ledger, and polling remain required.

## Authoritative references

- [Codex Streamable HTTP MCP authentication](https://learn.chatgpt.com/docs/extend/mcp#streamable-http-servers)
- [OpenAI OAuth 2.1 and per-tool scope guidance](https://developers.openai.com/plugins/guides/security-privacy#authentication--authorization)
- [GitHub App installation-token scoping and expiry](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
- [GitHub App permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps)
- [GitHub webhook validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [GitHub OIDC claims](https://docs.github.com/en/actions/reference/security/oidc)
- [AWS GitHub OIDC trust conditions](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html)
- [GitHub repository rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

## Revisit triggers

Revisit only if implementation proves that the existing WebSocket stack cannot
meet authorization/replay requirements, the organization cannot enforce the
required GitHub rulesets/environments, or OpenAI publishes a verifiable Codex
task identity that can safely replace correlation-only task references.
