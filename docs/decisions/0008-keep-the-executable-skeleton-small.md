# ADR 0008: Keep the executable skeleton small

Status: Superseded in part by ADR 0010

Date: 2026-08-03

The loopback server and TypeScript prototype boundaries described below were
removed before live use. ADR 0010 keeps only the repository tooling and static
UI outcome.

## Context

Task 4 needs an executable foundation, not an early implementation of the
control plane. The migration's first implementation rule is KISS: Keep It
Simple, Silly.

## Decision

- Use one private npm package on Node.js 22.17.1 and TypeScript.
- Use Node's built-in HTTP and test modules. Add no application framework or
  test framework until a real requirement needs one.
- Keep API, domain, deployment-adapter, GitHub, configuration, static UI, and
  test boundaries as small directories in this repository.
- Expose only read-only health/status responses in Task 4.
- Keep the deployment adapter and GitHub gateway explicitly disabled. Add no
  GitHub SDK, AWS SDK, database, queue, cache, OAuth, credential, or deployment
  endpoint.
- Keep the first UI as plain static HTML, CSS, and JavaScript with no build
  framework. Later UI work may revisit this only if the operational UI proves
  the need.
- Run formatting, lint, type checking, build, and unit tests through one
  credentialless CI job with read-only repository contents permission.
- During the current owner-approved credentialless bootstrap, push audited
  changes directly to `main` after a fresh remote-head check.

## Consequences

The repository can compile, test, and show its intended boundaries without
having any path to GitHub or an environment. Task 5 can add deterministic fake
behavior without first removing speculative infrastructure. Live capabilities
remain blocked behind their owning tasks and the Task 3 security gates.
