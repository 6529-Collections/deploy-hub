# Deploy Hub Agent Instructions

This repository is the durable source of truth for Deploy Hub requirements,
architecture, decisions, diagrams, migration planning, and—after explicit
approval—implementation.

## Required reading order

Before changing the project, read:

1. `README.md`
2. `STATUS.md`
3. `TODO.md`
4. `docs/requirements.md`
5. `docs/architecture.md`
6. `docs/migration-plan.md`
7. `docs/testing-strategy.md`
8. All accepted records in `docs/decisions/`

Read files under `docs/references/` when validating claims about Release Bus or
the original Deploy Hub proposal. Treat those files as immutable source
material.

## Persistence rules

- Do not leave decisions, requirements, diagrams, open questions, or next steps
  only in a Codex conversation.
- Save material conclusions in the appropriate file during the same task.
- Update `STATUS.md` after every material planning or implementation session.
- Treat `TODO.md` as the canonical execution tracker. Update task status and
  durable evidence in the same change that materially advances a task.
- Never mark a task complete from assertion or checkbox state alone. Reinspect
  its acceptance criteria and exact linked implementation, PR, workflow, and
  runtime evidence when answering whether a task is done.
- Add a dated entry to `CHANGELOG.md` for every material document change.
- Record architectural decisions in `docs/decisions/` instead of silently
  changing the architecture.
- Mermaid source files in `docs/diagrams/` are canonical. Keep copies embedded
  in architecture and migration documents synchronized.
- Never edit the copied handoff documents in `docs/references/`.

## Current safety boundary

- The repository is specification-only until `STATUS.md` explicitly records an
  approved implementation phase.
- Do not add executable GitHub Actions, dependencies, GitHub App permissions,
  repository secrets, environments, AWS roles, or deployment credentials
  without explicit current-task authorization.
- Do not change frontend, backend, Release Bus, GitHub workflows, AWS resources,
  live deployment state, or Release Bus controls from this repository without a
  separately authorized operation.
- Shadow behavior must be permission-isolated. A software flag alone is not a
  sufficient boundary.
- Do not add a Git remote other than the approved
  `6529-Collections/deploy-hub` origin without explicit approval.

## Development conventions

- While `STATUS.md` records the repository as private and specification-only,
  documentation changes may be committed and pushed directly to `main`.
- Before adding executable application code, GitHub Actions, permissions,
  credentials, or deployment authority, switch to protected `main` with
  task-owned `agent-prxt/` branches and ready-for-review pull requests.
- After that switch, new task-owned branches use the `agent-prxt/` prefix
  followed by concise kebab-case.
- Open normal ready-for-review pull requests unless the user explicitly asks
  for a draft.
- State requirements as testable outcomes.
- Clearly separate MVP, later work, non-goals, and open decisions.
- Optimize for agent-owned feature lifecycles and exact deployment operations;
  do not recreate Release Bus trains or autonomous candidate claiming under new
  terminology.
