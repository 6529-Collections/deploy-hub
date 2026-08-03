# Deployment Communications and Release-Note Analysis

Status: Integrated design input; source implementation remains open

Last updated: 2026-08-03

## Source evidence

This analysis incorporates the long-running Codex task:

- Task: `RELEASE ATTRIBUTION & FE RELEASE NOTES`
- Task ID: `019faa0e-272b-7f62-843a-79fffb815a7e`
- Backend: [PR #1869](https://github.com/6529-Collections/6529seize-backend/pull/1869)
- Frontend: [PR #3504](https://github.com/6529-Collections/6529seize-frontend/pull/3504)

Task 1 re-inspected them on 2026-08-03. Both PRs were open, ready-for-review,
unmerged, and had no GitHub Deployment record for their exact heads. The
backend head was `5b61104b94573f792559272da7db60fa03bbc0fc`, conflicting and
five commits behind current backend `main`; the frontend head was
`b798c0d344b9c8ffaecc402c7f38f39bddd2df2a`, mergeable and one commit behind
current frontend `main`. The source task had no active turn. These PRs remain
implementation evidence and a likely foundation, not an authoritative
deployed baseline. See `docs/current-system-inventory.md` for the complete
current-main path and exact source snapshot.

## Existing pipeline being established

The coupled work establishes this repository-owned path:

```text
canonical deployment workflow
→ exact workflow/run/deployment evidence
→ backend CI-alert receiver
→ CI deployment drop
→ production-only release-note eligibility
→ asynchronous queue and generator
→ release-note drop or explicit terminal skip/failure
```

The frontend workflows and both repository notifier helpers gather or forward
immutable deployment evidence. The backend authenticates and validates the
evidence, renders deployment notifications, decides production release-note
eligibility, queues generation, selects a safe production baseline, applies
deduplication, and publishes the release note.

## Reusable invariants

### Authority, requester, and contributors are different identities

- Deployment authority is the authenticated system that started the workflow.
- Requester is the human or Codex task that authorized the Deploy Hub request.
- Contributors are humans whose changes are proven to be present in the exact
  deployed operation.
- One identity may occupy more than one role, but no role is inferred from
  another.
- A train-shaped string or caller-supplied contributor list is not authority
  evidence.

Deploy Hub records the GitHub login resolved from the caller token as the
authenticated authority and workflow executor. `Deploy Hub` remains the
operation origin, not a synthetic person. It must never masquerade as `Release
Train` or collapse the requester or contributors into the workflow actor.

### Contributor scope follows immutable deployed evidence

- Frontend contributors come from the bounded exact deployed range and
  associated PR evidence.
- Backend contributors are narrowed to the exact PRs and services represented
  by that service deployment.
- Contributors are deduplicated case-insensitively; bots, GitHub Apps, and
  automation-only identities are excluded.
- Mapped users become 6529 mentions; unmapped valid users become GitHub profile
  links.
- If evidence cannot be established within bounded GitHub calls, contributors
  are omitted with a diagnostic. The CI notification still proceeds.
- Exact retries retain the immutable evidence. Rollback, repair, recovery, and
  explicit no-PR operations do not inherit contributors from older work.

### CI posting and release-note publication are distinct outcomes

Receiver acceptance proves only that the CI notification was accepted. It does
not prove that a release note was eligible, enqueued, generated, deduplicated,
or published. Those milestones and failures must remain individually visible.

Release notes are production-only and asynchronous. Staging notifications are
release-note-ineligible. Deployment health, exact-version proof, and mandatory
environment E2E determine deployment success; release-note publication does
not hold an environment lock or convert a healthy deployment into a failed
deployment. A release-note failure remains an explicit operational warning and
follow-up event, never a hidden success.

### Release-note comparison is exact and idempotent

- Only explicitly approved production workflow identities can participate in
  baseline selection.
- Current, failed, cancelled, staging, unrelated, chronologically invalid, and
  unsafe comparison runs are rejected.
- Same-SHA redeployment produces an explicit terminal already-deployed outcome
  instead of republishing an older change range.
- Behind, diverged, rollback, missing, or unknown ranges fail closed and do not
  generate a note.
- Backend multi-service releases share one canonical release group and publish
  only after the intended service set has completed.
- Duplicate notification or queue delivery does not create a duplicate CI drop
  or release note.

## Deploy Hub integration boundary

Deploy Hub must reuse this pipeline. It must not implement another notifier,
contributor resolver, release-note generator, queue, or publication store.

For each repository adapter, Deploy Hub supplies enough immutable context for
the canonical workflow to prove:

- Deploy Hub request ID, origin, and authenticated GitHub authority;
- requester and originating Codex task;
- repository, PR, exact source SHA, environment, and selected services;
- exact workflow run, workflow identity, ref, and deployed runtime identity;
- explicit no-PR/internal/recovery intent when applicable;
- production release grouping when multiple backend services form one release.

The repositories remain responsible for collecting and validating contributor
evidence and for submitting the notification payload. Deploy Hub observes and
links the resulting CI-drop and production release-note outcomes in its API,
Check Run, task event, audit history, and UI.

## Required status presentation

The UI and task-facing evidence must distinguish at least:

- CI notification not applicable, pending, accepted, or failed;
- release note ineligible, pending, enqueued, skipped, already published,
  published, or failed;
- exact diagnostic and recovery link when a side effect fails.

These are communication side-effect states, not additional deployment state
machine terminals. Their exact machine schema belongs to Task 2.

## Verification still required

- Reinspect both PRs whenever their heads or merge state change, then repeat
  the current-main contract audit after merge.
- Confirm the final canonical workflow names, paths, inputs, outputs, and
  authentication rules at repository `main`.
- Determine how the existing backend exposes asynchronous queue/generator
  outcomes to Deploy Hub without adding a second durable state store.
- Define the exact GitHub-authority plus `Deploy Hub` origin evidence contract
  without retaining Release Bus train semantics.
- Verify canonical frontend production baseline selection after Release Bus
  workflows are retired and historical runs remain in GitHub.
- Prove the backend-first compatibility and rollout order before any adapter
  depends on the new payload.
