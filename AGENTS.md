# Deploy Hub Agent Instructions

Deploy Hub is currently a frontend-only project. Do not widen active scope to
backend deployment support without an explicit user decision made after the
frontend pilot.

## Required reading order

Before changing the project, read:

1. `README.md`
2. `STATUS.md`
3. `TODO.md`
4. `docs/frontend/requirements.md`
5. `docs/frontend/architecture.md`
6. `docs/frontend/testing-and-rollout.md`
7. Relevant flows under `docs/frontend/flows/`

Files under `archive/original-cross-repo-plan/` are historical reference only.
They are not active requirements, decisions, or tasks. Do not edit archived
handoff sources.

## Rule 1

KISS: Keep It Simple, Silly.

- Add only the smallest mechanism required by the current task.
- Do not recreate Release Bus trains, candidate discovery, global claims, or a
  second deployment implementation.
- Do not add a Deploy Hub backend, proxy, Lambda, database, Git ledger, custom
  queue, scheduler, callback receiver, SSE, or WebSocket.
- A bounded failure branch inside a finite GitHub workflow is permitted; a
  continuously running reconciler is not.
- Put concerns such as PR feedback, E2E, release notes, retry, and diagnostics
  inside the owning top-level task rather than creating new top-level projects.

## Persistence rules

- Do not leave decisions, requirements, diagrams, or next steps only in a
  conversation.
- `TODO.md` is the sole active implementation tracker.
- Update `STATUS.md` and `CHANGELOG.md` with material planning or implementation
  changes.
- Mark a task `DONE` only after inspecting every acceptance criterion and its
  durable evidence.
- Keep Mermaid diagrams and their adjacent explanation synchronized.
- Keep the archived broad plan intact unless correcting archive navigation or
  provenance.

## Current safety boundary

- Static read-only GitHub authentication is implemented and owner-approved.
- No deployment or repository mutation capability currently exists.
- Task 1 must be physically unable to update refs, dispatch canonical deploys,
  assume environment roles, or publish real CI/release-note communications.
- Do not change `6529seize-frontend`, GitHub workflow permissions, staging,
  production, AWS, or Release Bus controls without explicit current-task
  authorization.
- GitHub repository, workflow, ref, and environment protections—not client-side
  UI checks—must enforce every later mutation.
- Canonical manual frontend workflows remain available throughout rollout.

## Repository workflow

- During the owner-approved public static-app bootstrap, commit and push
  audited changes directly to `main`.
- Fetch `origin/main` immediately before every push and stop on divergence or
  unexpected worktree changes.
- Reconsider protected main and reviewed PRs before adding deployment mutation
  capability, a repository secret, an environment permission, or another write
  actor.
- Do not add another Git remote without explicit approval.

## Development

- Install: `npm install --ignore-scripts`
- Full check: `npm run check`
- Individual checks: `npm run format:check`, `npm run lint`, and `npm test`
- The app is plain static HTML, CSS, and JavaScript. Do not add or start a local
  server unless the user explicitly requests one.
- Humans authenticate directly with GitHub from the browser. Codex uses its
  existing GitHub authentication.
