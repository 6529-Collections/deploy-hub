Yes. The safety model is sensible, but I see several concrete controller defects that can independently produce the SHA, state, and authorization failures you described.

The most serious problems are:

1. **A mutable-`main` race creates false SHA/auth failures.**

The controller resolves `main` to SHA A and stores A as immutable operation identity ([release-bus-v2.operations.ts:687](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.operations.ts:687)). It later dispatches the workflow using the mutable string `main` ([release-bus-v2.operations.ts:848](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.operations.ts:848)). Authorization then requires the resulting run’s head SHA to still equal A ([release-bus-v2.operations.ts:998](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.operations.ts:998)).

If `main` moves between resolution and dispatch:

`record SHA A → main moves to B → dispatch main/B → authorize expects A → failure`

Most compose, preflight, deploy, and staging-ref operations use `ref: 'main'`. Worse, retries preserve A, so once `main` has moved, retrying the operation can never heal it.

2. **Uncertain dispatches can create duplicates, which then poison staging validation.**

GitHub’s dispatch API returns no run ID. The bus searches only the latest 100 workflow runs for the operation key ([release-bus-v2.github-app.ts:1909](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.github-app.ts:1909)). After a 30-second discovery window, it can eventually dispatch the same attempt again ([release-bus-v2.operations.ts:870](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.operations.ts:870)).

If both copies exist, only one can bind to the operation. The other fails authorization. But the final staging fence considers any unrecognised staging workflow run evidence of a mixed environment ([release-bus-v2.github-app.ts:2028](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.github-app.ts:2028)). It records only one discovered run per attempt ([release-bus-v2.reconciler.ts:5376](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.reconciler.ts:5376)).

Consequently, a duplicate that never changed staging can invalidate a completely successful E2E run.

3. **Critical authorization and callback requests are single-shot.**

Normal v2 workflows call `/authorize` and `/report-progress` using one `curl`, without retry or backoff—for example [release-bus-v2-compose.yml:43](/Users/tarmokalling/6529/6529seize-backend/.github/workflows/release-bus-v2-compose.yml:43). The frontend workflows have the same pattern.

That is especially wasteful because the server explicitly supports idempotent repeated terminal reports ([release-bus-v2.operations.ts:1057](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.operations.ts:1057)). A momentary API, DNS, TLS, or network failure becomes “workflow completed without a structured terminal callback.” For staging mutation operations, that is treated as a control-plane failure and can trigger rollback or pause—not an ordinary retry.

4. **There was a guaranteed staging-ref reporting bug in the checked-out frontend.**

The checked-out frontend uses:

```sh
retryable="$(jq -er .retryable "$result")"
```

at [release-bus-v2-advance-staging-ref.yml:210](/Users/tarmokalling/6529/6529seize-frontend/.github/workflows/release-bus-v2-advance-staging-ref.yml:210). `jq -e` exits non-zero when the valid value is `false`; under `set -e`, a successful non-retryable result aborts before reporting success.

Your locally fetched `origin/main` already contains a fix, while the frontend checkout is 30 commits behind. The backend received the analogous fix today. This is exactly the kind of bus bug that makes a successful staging operation look like corrupt controller state.

5. **Control-plane upgrades are coupled to mutable repository state without real protocol versioning.**

The deployed API/reconciler, backend workflows, frontend workflows, DB migrations, and hard-coded trust hashes are separate moving pieces. Yet old controllers immediately dispatch workflows from current `main`. `release_train_revision` is generally just the constant `"1"`; it is not a negotiated controller/workflow protocol version.

Therefore, merging a workflow change can alter the active protocol before the compatible API/reconciler has been deployed—the bus must then use the possibly incompatible bus to deploy its own fix. The many legacy compatibility branches and exact blob-transition allowlists are symptoms of this self-upgrade problem.

The scale of ongoing churn reinforces this: since July 23, the backend history has 196 commits touching Release Bus paths, including 118 commits with fix/harden/repair/retry-like descriptions.

6. **The fail-closed path has both excessive blast radius and stale state.**

A non-GitHub error while claiming either lane pauses `ALL` ([release-bus-v2.reconciler.ts:1686](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.reconciler.ts:1686)). Thus a staging state problem can disable production too.

More subtly, `stagingEnabled` and `productionEnabled` were computed before that pause. The same invocation then continues and advances active trains using those stale booleans ([release-bus-v2.reconciler.ts:1738](/Users/tarmokalling/6529/6529seize-backend/src/releaseBusV2/release-bus-v2.reconciler.ts:1738)). So the code can set `ALL` paused and still mutate a train during that tick.

My conclusion: the bus is not merely “too strict.” It contains genuine distributed-systems races, inadequate transport recovery, and a brittle self-upgrade model. Those are fully capable of making stable release candidates fail unpredictably.

The first stabilization effort should be narrowly focused on immutable workflow-control refs, duplicate-proof dispatch discovery, retryable/idempotent callbacks, lane-local pausing, and a versioned control-plane protocol. Feature work on the bus should probably stop until those paths survive a sustained burn-in. No files, state, branches, or workflows were changed during this audit.