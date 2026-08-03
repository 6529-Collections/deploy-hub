# Deploy Hub Testing Strategy

Status: Agreed simplified MVP

Last updated: 2026-08-03

## Purpose

Prove that Deploy Hub invokes exact canonical deployment paths, reports
GitHub/runtime truth, keeps frontend and unrelated backend work independent,
and can be introduced without blocking colleagues.

Release Bus is OFF. Canonical manual workflows are the fallback throughout
testing.

## 1. Offline tests

Use small deterministic fakes only where they exercise current architecture:

- exact-SHA and allowlist validation;
- staging versus explicit production authorization;
- canonical workflow input mapping;
- GitHub run discovery by operation correlation;
- duplicate request before dispatch and the workflow concurrency fallback;
- moved source before dispatch;
- queued, running, succeeded, failed, and cancelled GitHub runs;
- runtime identity match and mismatch;
- E2E success, product failure, infrastructure failure, and snapshot drift;
- cancellation and same-exact-SHA retry;
- complete five-second UI snapshot replacement;
- communication link present, absent, published, skipped, and failed without
  changing deployment truth.

The retired standalone server, callback/event fakes, ledger tests, and strict
ledger contracts have been removed. Add only the smallest fakes needed to test
the current workflow-run/runtime architecture.

## 2. Authentication and security tests

- Accept a valid GitHub Bearer token and derive login through GitHub `/user`.
- Reject missing, malformed, invalid, revoked, inaccessible, and unauthorized
  tokens before mutation.
- Prove task reference, requester text, branch, PR label, or contributor list
  cannot grant authority.
- Prove staging authority cannot invoke production.
- Recheck explicit production authority and exact `main` SHA immediately before
  mutation.
- Enforce fixed repository, workflow, ref, environment, and service allowlists.
- Seed a fake token marker and prove it never reaches URLs, responses, logs,
  PR feedback, snapshots, fixtures, Sentry, or artifacts.
- Prove the browser forget action removes its stored token.

Do not add GitHub App, OAuth, callback, webhook, SSE, WebSocket-authentication,
or new AWS-IAM test suites unless an approved implementation adds that boundary.

## 3. UI delivery and polling tests

- Resolve `deploy-hub/main` once and serve HTML/CSS/JavaScript from that exact
  SHA without mixing assets.
- Keep the private-repository fetch credential server-side.
- Require GitHub Bearer authentication for every operational snapshot/command.
- Display the UI source SHA.
- Publish and roll back UI by changing `deploy-hub/main`, without a backend
  deployment.
- Show a newly discovered workflow run by the next normal poll, no later than
  five seconds.
- Update phase, GitHub waiting reason, blocker, runtime identity, validation,
  communication link, and terminal result without browser refresh.
- Interrupt polling and prove the next complete snapshot repairs the view with
  no cursor or event replay.
- Use ETags/conditional requests for unchanged snapshots.
- Keep a healthy deployment successful when a communication outcome is absent
  or failed.

## 4. Credentialless shadow

Use one opt-in credentialless workflow to test request planning, operation/run
correlation, GitHub waiting state, PR feedback on test PRs, lookup, polling UI,
cancel, retry, stale source, and failure presentation.

The shadow identity must be physically unable to:

- update `1a-staging`, `main`, or another protected ref;
- invoke canonical deploy workflows;
- access staging/production AWS roles;
- publish real CI drops or release notes; or
- present shadow output as real deployment evidence.

Use `1a-deploy-hub` only if real branch-trigger behavior cannot be tested from
exact opted-in SHAs. If used, it triggers the same single credentialless shadow
workflow; it is not another staging lane.

## 5. Controlled staging canaries

Announce a low-risk window and keep manual canonical deployment immediately
available. Start with the least risky exact deployment.

Required cases:

- frontend-only staging followed by all 12 baseline packs;
- backend-only staging followed by all 12 baseline packs;
- coordinated backend/frontend staging followed by one shared E2E run;
- frontend deployment overlapping an unrelated backend deployment;
- exact runtime version proof before E2E;
- exact environment snapshot before and after E2E;
- product E2E failure with no automatic retry;
- infrastructure/setup failure with explicit bounded rerun;
- snapshot drift reported as stale and rerunnable;
- GitHub cancellation and same-SHA retry;
- useful canonical workflow check/commit-status and UI links;
- exact CI-drop authority/requester/contributor attribution; and
- staging confirmed release-note-ineligible.

Deploy Hub does not hold a custom cross-repository E2E lock. A changed snapshot
invalidates the test result and triggers a rerun. Colleagues retain their normal
canonical deployment path.

The initial staging E2E guidance is approximately seven minutes. Show elapsed
time; do not build rolling ETA analytics before real use proves a need.

## 6. Restart and recovery checks

- Restart the backend before a dispatch and prove no mutation was reported.
- Restart after dispatch and recover the run from GitHub correlation.
- Look up a run that finished while the backend was unavailable.
- Attempt an identical duplicate request and a conflicting operation reuse.
- Cancel the GitHub run outside Deploy Hub and report that truth.
- Move `main` between preparation and production dispatch and fail closed.
- Advance `deploy-hub/main` while browsers are open without mixing UI assets.
- Interrupt snapshot polling while operation state changes.
- Redeploy a known-good exact version through the canonical manual path.

There is no event replay, callback recovery, lock-owner cleanup, or reconciler
test because the MVP has none of those systems.

## 7. Production pilots

- Start with an explicitly authorized low-risk backend service release.
- Perform an explicitly authorized low-risk frontend release.
- Run all 11 production-safe baseline packs against each exact snapshot.
- Prove exact runtime identity before and after E2E.
- Verify frontend release-note baseline selection and backend per-PR/service
  attribution in the existing communication pipeline.
- Observe published, skipped, already-published, queue/generation failure, and
  unavailable outcomes without changing deployment/E2E truth.
- Exercise a controlled validation failure and report `deployed but not
  validated` truthfully.
- Exercise the canonical break-glass path separately.
- Confirm staging remains independent.

The initial production E2E guidance is approximately four minutes. Show elapsed
time rather than promising an ETA.

## 8. Establishment gate

Deploy Hub becomes the normal entry point only when:

- all four canonical adapters have succeeded in real use;
- every success has exact runtime proof;
- staging has all 12 packs and production has all 11 packs bound to unchanged
  snapshots;
- frontend-only, backend-only, and coordinated paths have passed;
- unrelated frontend/backend work was not globally serialized;
- duplicate, stale, failure, retry, cancel, restart, and snapshot-drift cases
  were exercised;
- PR feedback and UI match GitHub/runtime truth;
- an open UI updates and repairs itself without refresh;
- CI drops/release notes have correct attribution without becoming deployment
  gates;
- no unexplained environment drift or colleague-blocking behavior occurred;
  and
- canonical manual deployment remains documented and usable.

Build a separate isolated cloud environment only if a specific unsafe behavior
cannot be tested by offline tests, credentialless shadowing, dry runs, or these
controlled canaries.
