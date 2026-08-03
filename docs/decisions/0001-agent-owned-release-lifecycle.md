# ADR 0001: Agent-Owned Release Lifecycle

Status: Accepted

Date: 2026-07-31

## Context

Release Bus centrally discovers candidates, claims them into trains, composes
release state, progresses environments, and reconciles external workflows. The
intended developer experience is instead an ongoing Codex task that already
knows the feature, repositories, pull requests, exact SHAs, requested target,
and authorization.

Moving the full Release Bus orchestration model into Deploy Hub would duplicate
the active agent and recreate the same complexity under a new name.

## Decision

The initiating Codex task owns the feature lifecycle from implementation to the
requested environment. Deploy Hub owns one exact deployment operation from
acceptance through terminal reporting.

Deploy Hub will not autonomously discover candidates, batch unrelated changes,
or own global release trains.

## Consequences

- Direct GitHub operations and exact run lookup are the primary agent
  interfaces; callbacks and a Deploy Hub HTTP API are not required for MVP.
- The UI is a shared operational view, not the release decision-maker.
- Coordinated frontend/backend changes are plans composed by the agent from
  independent operations.
- Request state remains small and reconstructable.
- Repository workflows remain canonical.
- Codex tooling must persist production intent and resume until success or a
  genuine blocker.
