# Release Bus → Deploy Hub Migration Assessment

We currently have an existing deployment orchestration system called **Release Bus**.

Release Bus is already implemented and may contain significant complexity, including GitHub Actions, AWS Lambda functions, AWS infrastructure, queues, state management, deployment workflows, environment coordination, notifications, and other components.

We want to evaluate migrating or evolving Release Bus into a new system called **Deploy Hub**.

The objective is not merely to rename Release Bus. Deploy Hub represents a more explicit deployment-control model with clear environment state, queue visibility, GitHub PR integration, automated progression, rollback, and a dedicated operational UI.

Please inspect the existing Release Bus implementation and produce a detailed comparison, migration assessment, and proposed implementation plan.

---

# 1. Deploy Hub Concept

Deploy Hub is a centralized deployment coordinator for multiple repositories and deployable components.

Initially, assume at least:

- Frontend repository
- Backend repository
- Shared staging environment
- Production environment

Deploy Hub should coordinate deployments while allowing frontend-only, backend-only, and coordinated frontend-plus-backend releases.

Deploy Hub itself does not necessarily need to be a continuously running application.

The preferred model is:

- A dedicated Deploy Hub GitHub repository
- GitHub Actions for workflow execution
- Small orchestration scripts where needed
- Durable state stored externally, potentially in S3
- Existing AWS infrastructure reused where appropriate
- No permanently running service unless justified by the existing architecture or operational requirements

The dedicated Deploy Hub repository may contain only orchestration code, workflows, configuration, and a static UI.

Example structure:

```text
deploy-hub/
├── .github/
│   └── workflows/
├── scripts/
├── config/
└── ui/
```

---

# 2. Core User Experience

A developer should be able to request deployment from an individual pull request.

For example:

```text
Frontend PR #3292
```

The developer should be able to request one of the following outcomes:

```text
Take to staging
Take to production
```

“Take to production” implicitly includes all required staging validation before production deployment.

The developer should not need to manually monitor the workflow.

Deploy Hub should automatically:

1. Queue the request.
2. Wait until the relevant environment is available.
3. Prepare the deployment candidate.
4. Deploy it to staging.
5. Run the required checks and tests.
6. Promote it to production when requested and successful.
7. Save the resulting known-good state.
8. Roll back or restore the previous known-good state if deployment or validation fails.
9. Continue processing other eligible requests.
10. Notify the developer of success, failure, blocking conditions, or required intervention.

Manual intervention should be the exception, not the normal flow.

---

# 3. GitHub Pull Request Integration

This is a non-negotiable requirement.

Looking at a PR in GitHub should immediately show its current Deploy Hub status.

Use a GitHub-native mechanism such as a **Check Run** attached to the PR head commit.

The PR should show information such as:

```text
Deploy Hub — Staging

Status: Queued
Queue position: 2
Target: Staging
```

Then update the same check as the request progresses:

```text
Queued
Preparing candidate
Building
Waiting for staging
Deploying to staging
Waiting for health checks
Running smoke tests
Running integration tests
Running end-to-end tests
Available on staging
Promoting to production
Running production checks
Completed
Failed
Rolled back
Blocked
Stale
```

The check should include:

- Target environment
- Current step
- Queue position, where meaningful
- Release or request ID
- PR number
- Repository
- Head commit SHA
- Candidate commit or deployment version
- Failure summary, where applicable
- Link to the Deploy Hub UI
- Final conclusion

Optionally, Deploy Hub may also maintain one sticky PR comment containing a more detailed progress summary.

Do not create a new comment for every status update. Update the same comment.

The design must handle the case where a new commit is pushed to a PR while an older SHA is queued or deploying.

Please recommend whether the old request should:

- be cancelled automatically,
- be marked stale,
- or continue only under an explicit policy.

---

# 4. Deploy Hub UI

This is also a non-negotiable requirement.

Deploy Hub should have a dedicated operational UI showing the full state of the deployment system.

The UI may be a static HTML/CSS/JavaScript application stored in the Deploy Hub repository and served or proxied by the existing backend.

Example route:

```text
https://api.6529.io/deploy/ui/hub
```

The UI may call backend endpoints such as:

```text
GET /deploy/api/hub
GET /deploy/api/hub/queue
GET /deploy/api/hub/environments
GET /deploy/api/hub/releases
GET /deploy/api/hub/releases/{releaseId}
```

The UI should show at least:

## Current activity

```text
Current request
Repository
PR
Target environment
Current step
Start time
Elapsed time
Candidate versions
Previous checkpoint
```

## Queue

```text
Queue order
Request ID
Repository
PR
Target
Requested by
Created time
Current eligibility
Blocking reason
Linked requests
```

## Environment state

For staging and production:

```text
Frontend version
Backend version
Included staging-only changes
Status
Last successful deployment
Previous known-good checkpoint
Current deployment
Health status
```

## Release history

```text
Release ID
Included PRs
Frontend version
Backend version
Target
Result
Failure reason
Rollback result
Started time
Completed time
```

## Linked releases

The UI should clearly represent coordinated releases containing:

```text
Frontend PR
Backend PR
Deployment ordering
Shared validation result
```

The initial UI may poll the backend every few seconds for status updates.

A more advanced streaming mechanism is optional and should only be recommended if materially useful.

---

# 5. Deployment Queue Model

Deploy Hub should have a durable deployment request queue.

The queue must not exist only as pending GitHub workflow runs.

GitHub workflows may wake up the coordinator, but the actual requests must be stored durably.

A request may represent:

```text
One frontend PR
One backend PR
One explicitly linked frontend-plus-backend feature
```

Suggested request fields:

```json
{
  "id": "deploy-000184",
  "repository": "6529-Collections/6529seize-frontend",
  "pullRequest": 3292,
  "headSha": "abc123",
  "target": "staging",
  "status": "queued",
  "requestedBy": "username",
  "createdAt": "timestamp"
}
```

For a coordinated release:

```json
{
  "id": "deploy-000185",
  "type": "coordinated",
  "target": "production",
  "items": [
    {
      "repository": "frontend-repo",
      "pullRequest": 3301,
      "headSha": "fe123"
    },
    {
      "repository": "backend-repo",
      "pullRequest": 812,
      "headSha": "be456"
    }
  ]
}
```

Deploy Hub should process one staging candidate at a time when the shared staging environment must remain stable during testing.

Other requests may build or run isolated CI in parallel, but no workflow may mutate the shared staging environment while another candidate is being deployed and validated.

---

# 6. Event-Driven Processing

Normal Deploy Hub processing should be event-driven.

Example:

```text
Developer requests deployment
→ request is written to durable storage
→ Deploy Hub workflow is triggered
→ workflow processes queue
→ workflow continues until queue is empty
→ workflow exits
```

When a request arrives while Deploy Hub is already processing another request:

```text
New request is persisted
→ a wake-up workflow may be triggered
→ existing coordinator continues
→ when current work finishes, it reads the next queued request
```

There should not need to be a continuously running worker.

There should also not need to be primary one-minute polling.

A scheduled recovery workflow may periodically check for:

- abandoned locks,
- stale running requests,
- queued work with no active processor,
- inconsistent environment state,
- interrupted GitHub workflows.

This scheduled process should be a recovery mechanism, not the primary execution model.

---

# 7. State Storage

The current preferred lightweight model is S3 unless the existing architecture strongly justifies another storage system.

Please assess whether S3 is sufficient based on the current Release Bus implementation.

Potential S3 structure:

```text
s3://deploy-hub/
├── environments/
│   ├── staging.json
│   └── production.json
├── queue/
├── active/
│   └── active-release.json
├── releases/
└── history/
```

Each queue request should be stored as a separate object to avoid concurrent writes to one large queue file.

Example:

```text
queue/20260731T104201Z-deploy-000184.json
```

State should distinguish:

```text
queued
claimed
preparing
building
deploying
testing
promoting
completed
failed
rolling-back
rolled-back
blocked
stale
cancelled
```

Please assess:

- whether S3 provides sufficient consistency and concurrency behavior,
- how requests should be claimed safely,
- how duplicate processing should be prevented,
- how state writes should be made idempotent,
- whether S3 object versioning should be enabled,
- whether conditional writes or another locking mechanism are needed,
- whether GitHub Actions concurrency is sufficient as the primary environment lock,
- and under what conditions DynamoDB or another state store would become necessary.

If the existing Release Bus already uses DynamoDB, SQS, Step Functions, Lambda, or another durable state system, compare the benefits of reusing it against simplifying toward S3.

Do not recommend replacing working infrastructure solely for architectural purity.

---

# 8. Environment State and Known-Good Checkpoints

Deploy Hub must track the complete known-good state of each environment.

A single Git commit is not sufficient because frontend and backend are separate deployable components.

Example staging manifest:

```json
{
  "environment": "staging",
  "status": "healthy",
  "frontend": {
    "repository": "frontend-repo",
    "commit": "fe-abc123",
    "artifact": "frontend-build-812"
  },
  "backend": {
    "repository": "backend-repo",
    "commit": "be-def456",
    "artifact": "backend-build-291"
  },
  "stagingOnlyChanges": [
    {
      "repository": "frontend-repo",
      "pullRequest": 3292,
      "headSha": "fe-abc123"
    }
  ],
  "lastSuccessfulRelease": "deploy-000183",
  "updatedAt": "timestamp"
}
```

The important model is:

```text
Save known-good state
→ deploy candidate
→ run tests
→ either save candidate as the new known-good state
→ or restore the previous known-good state
```

The saved state should include enough information to redeploy the actual previous environment composition.

Please determine whether rollback should use:

- deployment artifacts,
- container image versions,
- Git commit SHAs,
- deployment IDs,
- infrastructure version identifiers,
- or a combination of these.

Environment-specific builds are acceptable.

For example, frontend staging and production may require different baked environment variables.

The requirement is therefore not necessarily:

```text
identical staging and production bytes
```

It is:

```text
the production build is generated from the exact approved source revision and release definition
```

The system should avoid testing one commit on staging and later deploying an unrelated newer state from `main`.

---

# 9. Staging-Only Deployments

Deploy Hub must support PRs that are requested for staging but not production.

Example:

```text
PR #1 → staging only
```

After successful deployment:

```text
Staging:
production baseline + PR #1
```

Later:

```text
PR #2 → production
```

PR #2 must pass through staging without permanently removing PR #1.

Conceptually, the candidate may be:

```text
production baseline + existing staging-only PRs + PR #2
```

After PR #2 successfully reaches production, Deploy Hub may need to reconstruct staging as:

```text
new production baseline + remaining staging-only PRs
```

Deploy Hub must therefore persist the intended staging composition, not merely the most recent deployment hash.

Please assess the complexity and safety of this model.

In particular, address:

- conflicts between staging-only PRs and production candidates,
- stale PR branches,
- staging-only PRs that become unmergeable,
- staging-only PRs that depend on backend changes,
- removal of a staging-only PR,
- reconstruction of staging after production changes,
- whether staging-only changes should be automatically rebased or recreated,
- and when a durable preview environment would be more appropriate than shared staging.

Do not assume that shared staging can perfectly satisfy both persistent UAT and clean production qualification without tradeoffs.

Document those tradeoffs clearly.

---

# 10. Testing and Environment Locking

After any deployment changes the shared staging environment, future staging deployments must be blocked until the required validation completes.

The protected sequence is:

```text
Acquire staging lock
→ deploy candidate
→ wait for service health
→ run required tests
→ save successful checkpoint or restore previous checkpoint
→ confirm stable environment
→ release lock
```

Builds and isolated CI may run in parallel.

The lock only needs to prevent mutation of the shared environment while it is being validated.

Please identify:

- which current Release Bus operations already provide this behavior,
- which tests run before deployment,
- which tests run after deployment,
- which tests are component-specific,
- which tests require the complete staging system,
- which production checks should run after promotion,
- how flaky tests are handled,
- whether failed tests are retried,
- and what conditions should stop the entire queue versus quarantine one request and continue.

---

# 11. Failure Handling

The default deployment unit should be one request at a time.

Example:

```text
PR #1
→ deploy
→ test
→ pass
→ complete

PR #2
→ deploy
→ test
→ fail
→ retry according to policy
→ restore previous known-good staging state
→ mark PR #2 failed
→ continue with PR #3
```

This gives clear failure attribution and avoids arbitrary multi-PR batches.

If a request fails:

1. Retry only where appropriate.
2. Distinguish test failure from infrastructure failure.
3. Restore the previous known-good environment state.
4. Verify restoration health.
5. Mark the request failed or blocked.
6. Update the GitHub Check Run.
7. Update the Deploy Hub UI.
8. Notify the owner.
9. Continue with other eligible requests unless the environment itself is unhealthy.

Please describe how the current Release Bus behaves in each failure case and what would need to change.

Also address:

- deployment timeout,
- GitHub Actions cancellation,
- Lambda timeout,
- partial frontend/backend deployment,
- failed rollback,
- stale lock,
- duplicated workflow trigger,
- S3 update failure,
- test infrastructure outage,
- failed GitHub Check update,
- and production health-check failure.

All state transitions and deployment operations should be designed to be idempotent where possible.

---

# 12. Frontend and Backend Coordination

Deploy Hub must support:

## Frontend-only deployment

```text
Frontend changes
Backend remains unchanged
```

## Backend-only deployment

```text
Backend changes
Frontend remains unchanged
```

## Coordinated frontend-plus-backend deployment

```text
Frontend PR + Backend PR
→ one linked Deploy Hub request
→ deploy in defined order
→ run combined tests
→ promote as one logical release
```

The repositories should retain ownership of their own build and deployment implementation.

For example:

```text
Frontend repository:
- build frontend
- deploy frontend staging
- deploy frontend production

Backend repository:
- build backend
- deploy backend staging
- deploy backend production
```

Deploy Hub owns:

```text
what is being deployed,
which versions belong together,
when the deployments run,
which environment is locked,
the deployment order,
the validation policy,
the saved environment state,
rollback,
promotion,
queue progression,
status reporting.
```

Please compare this desired separation of responsibility with the current Release Bus design.

Identify whether Release Bus currently:

- contains deployment implementation that should remain centralized,
- invokes workflows in other repositories,
- directly calls AWS deployment APIs,
- or mixes orchestration and component-specific deployment logic.

Recommend what should remain and what should move.

---

# 13. Batching Policy

Deploy Hub should not initially combine arbitrary unrelated PRs based only on timing.

The default should be:

```text
one queued request
→ one staging deployment
→ one validation cycle
```

A coordinated frontend-plus-backend feature counts as one intentional request.

Do not treat every PR arriving within a 30- or 60-second window as one batch unless there is a strong operational reason.

Please inspect whether Release Bus currently batches deployments.

If it does, explain:

- how batches are formed,
- whether batching is time-based,
- whether it is repo-based,
- whether it is environment-based,
- whether multiple PRs are merged into one candidate,
- how failed batches are diagnosed,
- how one item is removed,
- and whether the batching behavior should remain, change, or be removed.

If current deployment throughput requires batching, propose a safe compatibility-based batching model and explain failure isolation.

---

# 14. Locks and Concurrency

Deploy Hub needs explicit concurrency rules.

At minimum, consider:

```text
Staging environment mutation capacity: 1
Production environment mutation capacity: 1
Frontend build capacity: potentially many
Backend build capacity: potentially many
Shared integration-test capacity: 1
```

A coordinated frontend-plus-backend release may need to acquire both component deployment lanes and the shared environment lock.

Please document:

- current Release Bus locks,
- current concurrency groups,
- whether locking occurs in GitHub Actions, AWS, or both,
- lock ownership,
- lock expiry,
- recovery from abandoned locks,
- and how to prevent two workflows from deploying to staging concurrently.

GitHub Actions concurrency may be used as a safety mechanism, but it should not be treated as the durable request queue.

---

# 15. Authentication and Permissions

Deploy Hub will need to interact across repositories.

Please assess the best authentication model.

A preferred long-term model may be an organisation-owned GitHub App such as:

```text
6529 Deploy Hub
```

Potential permissions:

```text
Checks: read/write
Pull requests: read/write
Contents: read
Actions: read/write where required
Commit statuses: read/write if used
Deployments: read/write if used
```

Please compare:

- GitHub App,
- GitHub Actions `GITHUB_TOKEN`,
- fine-grained personal access token,
- existing Release Bus credentials,
- and AWS-to-GitHub authentication already in place.

Also review AWS authentication.

Prefer GitHub Actions OIDC roles rather than long-lived AWS access keys where practical.

Identify all current secrets and permissions that would be affected by the migration.

---

# 16. Migration Requirements

Do not propose a big-bang rewrite unless clearly justified.

We need a safe migration from the current Release Bus to Deploy Hub.

Please provide a staged migration plan.

A possible structure is:

## Phase 1: Discovery and mapping

- Inventory Release Bus components.
- Document current workflows.
- Document Lambda functions.
- Document AWS resources.
- Document repositories involved.
- Document triggers.
- Document queue behavior.
- Document state storage.
- Document locks.
- Document deployment behavior.
- Document rollback behavior.
- Document current PR feedback.
- Document operational dependencies.

## Phase 2: Observability layer

Introduce Deploy Hub visibility without changing deployment behavior.

For example:

- Add GitHub Check Runs.
- Add the Deploy Hub UI.
- Read current Release Bus state.
- Display current queue and environment composition.
- Preserve Release Bus as the execution engine.

## Phase 3: Unified state model

Introduce the Deploy Hub release request and environment-state schema.

- Create durable request IDs.
- Define staging and production manifests.
- Add normalized status transitions.
- Map Release Bus operations into Deploy Hub state.
- Keep existing deployment execution where possible.

## Phase 4: Coordinator migration

Move orchestration decisions into the Deploy Hub repository or coordinator.

- Queue progression.
- Environment locks.
- Linked FE/BE releases.
- Check updates.
- State transitions.
- Recovery.

Reuse existing Lambda functions or deployment workflows as execution steps where useful.

## Phase 5: Deployment ownership cleanup

Separate:

```text
Deploy Hub orchestration
```

from:

```text
frontend deployment implementation
backend deployment implementation
```

Only move logic when doing so improves ownership and maintainability.

## Phase 6: Cutover

- Run Deploy Hub in shadow mode.
- Compare decisions and observed state with Release Bus.
- Run low-risk staging-only requests through Deploy Hub.
- Run selected production releases.
- Define rollback to Release Bus.
- Gradually increase traffic.
- Disable old triggers only after stable operation.

## Phase 7: Decommissioning

- Remove obsolete Release Bus workflows.
- Remove unused Lambda functions.
- Remove unused queues and storage.
- Rotate or remove credentials.
- Archive documentation.
- Retain release history where required.

Please replace this proposed sequence with a better one if the existing architecture suggests it.

---

# 17. Required Analysis of Existing Release Bus

Please inspect the existing implementation and answer the following.

## Architecture

- Where does Release Bus live?
- Which repositories contain its code?
- Which GitHub workflows participate?
- Which Lambda functions participate?
- Which AWS services participate?
- Is there a central coordinator?
- Is anything continuously running?
- What wakes the system?
- What stores durable state?
- What is considered the source of truth?

## Queueing

- Where is the queue?
- Is it durable?
- Is it FIFO?
- Can requests be lost?
- Can pending workflows replace each other?
- How are duplicate requests prevented?
- How are requests prioritised?
- How are failed requests retried or skipped?

## Environment state

- How does Release Bus know what is currently deployed?
- Does it track frontend and backend independently?
- Does it store the last successful staging state?
- Does it store the last successful production state?
- Can it restore a previous full environment composition?
- Does it support staging-only PRs?

## Testing

- What tests run?
- Where do they run?
- What environment do they run against?
- Does the environment remain locked until tests complete?
- Can another deployment alter staging during validation?
- How are failures attributed?

## Promotion

- What does “take to production” do today?
- Does it always pass through staging?
- Does it merge before staging or after staging?
- Does it build from the PR SHA, merge commit, `main`, or another revision?
- Are frontend and backend promoted together?
- Are environment-specific builds produced?

## Rollback

- How is rollback initiated?
- What version is restored?
- Is rollback automatic?
- Is the environment validated after rollback?
- What happens if rollback fails?

## Developer experience

- How does a developer request deployment?
- How do they know their queue position?
- How do they know the current step?
- How do they know which environment is targeted?
- How are failures communicated?
- Is status visible directly from the PR?

## Operational experience

- How does an operator see the global queue?
- How do they see current staging composition?
- How do they see current production composition?
- How do they inspect active releases?
- How do they unblock or cancel work?
- How do they recover from a stuck workflow?

---

# 18. Comparison Format

Produce a clear comparison table with columns such as:

```text
Area
Current Release Bus
Target Deploy Hub
Gap
Recommended change
Migration risk
Can reuse existing implementation?
```

Cover at least:

- Request initiation
- GitHub integration
- Queue
- State storage
- Coordinator
- FE deployment
- BE deployment
- Linked FE/BE release
- Staging lock
- Production lock
- Testing
- Staging-only deployment
- Promotion
- Rollback
- Failure recovery
- UI
- Notifications
- Authentication
- Audit trail
- Observability
- Manual controls
- Infrastructure cost
- Operational complexity

---

# 19. Required Deliverables

Please provide:

## 1. Current-state architecture

A concise but complete explanation of Release Bus as implemented today.

Include a diagram.

## 2. Target Deploy Hub architecture

Show:

```text
PR request
→ GitHub integration
→ durable queue
→ Deploy Hub coordinator
→ frontend/backend deployment execution
→ testing
→ state update or rollback
→ PR status
→ Deploy Hub UI
```

Include a diagram.

## 3. Gap analysis

Explain what exists, what is missing, what conflicts with the Deploy Hub model, and what can be reused.

## 4. Migration plan

Provide incremental phases, dependencies, risks, rollback plans, and cutover criteria.

## 5. Repository-level change list

For every affected repository, list:

- workflows to add,
- workflows to modify,
- scripts to add,
- scripts to remove,
- permissions required,
- API contracts required,
- configuration changes,
- and ownership.

## 6. AWS change list

List:

- Lambda functions to reuse, change, or remove,
- S3 buckets or objects,
- DynamoDB tables if applicable,
- SQS queues if applicable,
- Step Functions if applicable,
- IAM roles,
- API routes,
- monitoring,
- alarms,
- and estimated operational impact.

## 7. State schemas

Propose concrete JSON schemas for:

- deployment request,
- active release,
- staging state,
- production state,
- release history,
- coordinated FE/BE release,
- failure,
- rollback,
- and GitHub Check Run metadata.

## 8. State-transition model

Define allowed transitions, for example:

```text
queued
→ claimed
→ preparing
→ building
→ waiting-for-environment
→ deploying
→ testing
→ promoting
→ completed
```

Failure branches should include:

```text
failed
rolling-back
rolled-back
blocked
stale
cancelled
```

Explain which component owns each transition.

## 9. Failure-mode analysis

Provide a table covering failure scenario, detection, automatic action, final state, user-visible status, and required manual intervention.

## 10. Recommended MVP

Identify the smallest useful Deploy Hub migration that delivers:

- PR Check Run status,
- durable queue visibility,
- current environment state,
- a Deploy Hub UI,
- known-good checkpoint restoration,
- and minimal disruption to current Release Bus execution.

## 11. Recommended final architecture

Explain what the architecture should become after migration, even if the MVP temporarily retains Release Bus components.

## 12. Open questions

List only genuine unanswered questions that cannot be determined from the repositories and infrastructure.

---

# 20. Design Principles

Use the following principles when making recommendations:

1. Prefer incremental migration over wholesale replacement.
2. Reuse proven Release Bus deployment logic.
3. Separate orchestration from component-specific deployment implementation.
4. Keep the queue durable and explicit.
5. Treat GitHub workflow triggers as wake-up signals, not as the queue itself.
6. Keep shared staging stable throughout deployment validation.
7. Track the complete environment composition, not one ambiguous hash.
8. Make all important state visible both globally and on the relevant PR.
9. Automate failure recovery where safe.
10. Continue processing unrelated eligible requests after one PR fails.
11. Make state transitions idempotent.
12. Preserve an auditable release history.
13. Avoid introducing Lambda, DynamoDB, Step Functions, or a permanent service unless they solve a concrete problem.
14. Do not remove existing AWS components simply because a simpler greenfield design exists.
15. Clearly distinguish what is required for the MVP from what is desirable later.

The final assessment should be specific to the existing Release Bus code and infrastructure. Avoid giving only a generic deployment-system design.