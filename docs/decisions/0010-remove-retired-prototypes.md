# ADR 0010: Remove retired prototypes from the active repository

Status: Accepted

Date: 2026-08-03

Supersedes the executable-server and prototype-extension parts of ADR 0008.
It also retires Tasks 2, 5, and 6 as implementation dependencies.

## Context

Tasks 2, 5, and 6 explored strict state contracts, callback/event fakes, and a
Git-backed ledger. Task 4 also created a loopback TypeScript server. The later
KISS decision selected a smaller live design: the existing 6529 backend owns
the authenticated API, canonical GitHub workflow runs own execution state, and
this repository owns documentation and the static UI.

Keeping thousands of lines of rejected implementation beside the live plan
made the repository and tracker misleading and created an obvious path for a
future implementation to extend the wrong architecture.

## Decision

- Keep this repository focused on documentation and plain static UI files.
- Keep only the npm tooling needed to format and lint those files.
- Remove the loopback server, TypeScript domain/adapters, callback/event fakes,
  Git-ledger implementation, ledger contracts, fixtures, and their tests.
- Mark Tasks 2, 5, and 6 `RETIRED`, not `DONE`, in the active tracker.
- Preserve the experiments in Git history and retired ADRs; they are not copied
  into a separate active archive.
- Define live HTTP contracts in the existing backend's OpenAPI specification
  when the owning task is explicitly implemented.
- Add future deterministic fakes only for the simplified workflow-run/runtime
  architecture and only when a current task needs them.

## Consequences

- `deploy-hub` has no server or production runtime.
- Task 4 remains complete only as the repository, CI/tooling, documentation,
  and static-UI foundation.
- Task 7 is explicitly a change to `6529seize-backend`; Task 10 and Task 11 are
  the first tasks that materially extend UI code in this repository.
- Git history remains available if a concrete future failure justifies
  revisiting a retired experiment.
