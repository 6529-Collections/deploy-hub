# Deploy Hub E2E Validation Analysis

Status: Accepted as the basis for ADR 0004

Last updated: 2026-08-03

## Conclusion

Deploy Hub should require a baseline deployed-environment E2E result for every
successful staging and production outcome.

This baseline is distinct from pull-request CI and feature-specific validation:

- PR CI proves the exact source before deployment.
- Repository deployment workflows prove build, health, and exact runtime
  identity.
- Baseline E2E proves that the deployed environment still supports its critical
  read-only user journeys.
- The initiating Codex task adds targeted or broader feature validation when
  change risk requires it.

The E2E workflows and test code remain owned by the frontend repository. Deploy
Hub schedules them, binds them to an exact environment snapshot, observes their
GitHub result, and publishes progress. It must not copy Playwright or test-pack
implementation into Deploy Hub.

## Current implementation

The current frontend repository has separate staging and production workflows.

| Environment | Current workflow | Post-deploy inventory | Browser coverage | Current trigger |
| --- | --- | ---: | --- | --- |
| Staging | `staging-e2e.yml` | 12 read-only packs | Desktop and mobile Chromium for all except one desktop-only pack | Automatically after a successful frontend `Web Deploy - STAGING`, or manually/through Release Bus |
| Production | `production-e2e.yml` | 11 production-safe read-only packs | Desktop Chromium | Release Bus-only workflow dispatch |

Both workflows:

- Live in `6529seize-frontend`.
- Test the deployed site rather than starting a local application.
- Install frozen dependencies and Chromium before running Playwright.
- Run up to three read-only packs concurrently.
- Produce structured evidence artifacts.
- Serialize runs per environment with `cancel-in-progress: false`.
- Have a 90-minute workflow timeout; each pack has a 15-minute timeout.

### Staging coverage

The staging post-deploy inventory currently covers:

- Core desktop and mobile surfaces.
- Home, About, and The Memes smoke paths.
- Waves and profile read-only journeys.
- Input-detection behavior.
- Public groups and tools.
- Delegation.
- NextGen and collections.
- Admin destructive-action guards.
- Public content.
- Profile deep links.
- Search.
- Media and mint details.
- Network, Open Data, and public API reads.

### Production coverage

Production uses production-safe read-only packs for home, social/profile,
media, delegation, network/open-data, collections, public groups/tools, admin
guards, public content, profile deep links, and search. It intentionally avoids
mutating production and currently runs only the desktop browser project.

## Current integration gaps

The tests themselves are reusable, but their orchestration is not yet a clean
Deploy Hub adapter:

1. Automatic staging E2E is triggered only by a frontend staging deployment.
   A backend-only staging deployment does not automatically create equivalent
   exact environment validation.
2. An automatic staging run can have `release_binding: null`; it proves the
   observed site behavior but does not bind frontend and backend runtime
   identities into one exact validation record.
3. Explicit staging and all production E2E inputs, authorization, operation
   keys, callbacks, and evidence are coupled to Release Bus train and manifest
   concepts.
4. The production workflow cannot currently act as a generic post-deploy
   validator for the canonical manual production path.
5. A single backend SHA is insufficient once independently deployable backend
   services may legitimately run different exact repository versions.

## Recommended Deploy Hub model

### Use a validation record, not a train

E2E validates an environment snapshot, not merely one repository commit. Use a
small exact validation record containing:

```text
validationId
environment
frontendRuntimeSha
backendRuntimeVersionsByService
linkedDeploymentRequestIds
testToolingSha
packPolicy
requestedBy
taskReference
```

This record does not discover candidates, batch unrelated changes, or progress
code between environments. The initiating Codex task explicitly requests it
for the exact deployment operation or coordinated set it owns.

For a backend-only deployment, `testToolingSha` should be the exact frontend
version currently deployed in that environment. For a frontend deployment, it
is normally the newly deployed frontend SHA. The backend version map records
the exact API and affected service versions rather than pretending that every
backend service shares one deployed SHA.

### Staging sequence

1. Complete the requested frontend and/or backend canonical deployments.
2. Prove health and exact deployed versions.
3. Acquire the short-lived `staging-validation` lock.
4. Verify that no staging mutation is active and record the exact environment
   snapshot.
5. Dispatch the staging E2E workflow for that snapshot.
6. Verify the snapshot has not changed before accepting the result.
7. Publish the result to every linked PR, the Deploy Hub UI, and the initiating
   Codex task, then release the lock.

The full current 12-pack read-only staging suite is fast enough to be the
initial mandatory baseline. Targeted authenticated, mutating, or deeper
cross-system tests remain feature- and risk-specific responsibilities of the
initiating Codex task.

For a coordinated backend/frontend feature, run baseline E2E once after all
intended components are deployed, then link the same exact validation result to
each deployment request. Do not run an expensive full suite after each
intermediate component.

### Production sequence

1. Complete the explicitly authorized canonical production deployment or
   coordinated set.
2. Prove health and exact deployed versions.
3. Acquire the `production-validation` lock and record the exact production
   snapshot.
4. Run all production-safe post-deploy read-only packs.
5. Reverify the snapshot, publish the result, and release the lock.

Production is not successful until this read-only E2E is terminal and green.
No test may mutate production.

### Concurrency boundary

An exact environment result is meaningless if another deployment changes that
environment during the test. The validation lock therefore blocks deployment
mutation to the same environment while E2E runs.

It does not block:

- Pull-request CI.
- Candidate preparation that cannot mutate the environment.
- Work for the other environment.
- Unrelated agent implementation and review activity.

With current timings, shared staging is normally protected for about seven
minutes rather than for the entire build, test, queue, and release lifecycle.
Waiting deployment requests remain visible with the exact validation owner and
estimated completion time.

### Failure semantics

- A staging E2E failure means `deployed but validation failed`. It blocks that
  exact result from production but does not pretend the staging mutation never
  happened. A fix or explicit retry creates new evidence.
- A production E2E failure also means production was already mutated. Mark the
  outcome failed, wake the owning agent, and block later production mutation
  until the exact runtime is reconciled, explicitly accepted, or replaced by a
  known-good exact redeployment.
- Infrastructure/setup failures may retry the same validation ID within a
  bounded policy. Product-test failures do not auto-retry into green.
- Staging remains independent from a production E2E failure, and production
  remains independent from a staging E2E failure.

## Observed durations

The following baseline was calculated from GitHub Actions history on
2026-08-03. Durations cover the complete E2E workflow, including checkout,
dependency installation, browser installation, test execution, evidence
validation, and artifact upload.

| Workflow sample | Runs | Mean | Median | 90th percentile | Observed range |
| --- | ---: | ---: | ---: | ---: | ---: |
| Most recent successful full staging runs | 20 | 6m 47s | 6m 36s | 7m 41s | about 5m 28s–8m 29s |
| Successful production runs | 18 | 3m 57s | 3m 24s | 3m 44s | 2m 53s–13m 34s |

No GitHub runner queue delay appeared in either measured sample. The production
maximum is one clear outlier; ordinary production runs clustered around three
to four minutes.

Of the most recent 30 nontrivial staging runs, 26 succeeded and four failed.
Three consecutive recent failures repeatedly identified the same media/mint
visibility assertion on both desktop and mobile, rather than an infrastructure
setup failure; the five subsequent full staging runs succeeded. Deploy Hub must
preserve this distinction between product E2E failure and retryable
infrastructure failure.

## Initial planning estimates

Use rolling observed history in the UI rather than permanent hard-coded ETAs.
Until enough Deploy Hub history exists, use:

| Environment | Typical UI estimate | Planning allowance | Slow-run warning |
| --- | ---: | ---: | ---: |
| Staging baseline E2E | 7 minutes | 8–10 minutes | 12 minutes |
| Production baseline E2E | 4 minutes | 5–6 minutes | 8 minutes |

The warning threshold should not automatically cancel a run. It should mark the
run delayed and expose the workflow link. Hard workflow timeouts should be
reviewed separately from these normal-duration estimates.

## Required workflow changes

Before Deploy Hub can use these suites:

- Replace Release Bus train/manifest authorization fields with a generic exact
  validation ID and environment-snapshot digest.
- Allow explicit Deploy Hub dispatch for both staging and production.
- Make backend-only and coordinated staging validation first-class.
- Preserve current read-only guards, pack evidence, concurrency, and
  non-cancelling behavior.
- Verify exact runtime identities before and after test execution.
- Report via GitHub workflow state and evidence that Deploy Hub can observe;
  do not require a Release Bus callback.
- Retain manual diagnostic pack selection without allowing partial diagnostics
  to satisfy mandatory baseline validation.

## Accepted decision

Mandatory baseline read-only E2E is required for every staging and production
outcome, using one exact environment-snapshot validation for a coordinated
deployment set. Keep deeper feature-specific and cross-system validation
risk-based. ADR 0004 is the authoritative decision record.

