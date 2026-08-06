# 2. Staging batching timeline

Illustrative times show how requests wait without blocking the active deploy,
how same-target requests batch, and why a production-target PR is separated
from a staging-target PR.

```mermaid
sequenceDiagram
    autonumber
    participant P1 as Dev 1 / PR 1
    participant P2 as Dev 2 / PR 2
    participant P3 as Dev 3 / PR 3
    participant DH as Frontend controller
    participant STG as Staging lane
    participant PROD as Production lane

    Note over DH,STG: 10:00 — staging content H0 is last known-good
    P1->>DH: Take exact PR 1 head to Staging
    DH->>P1: Target: Staging / Deploying staging snapshot C1
    DH->>STG: Non-force push C1, then deploy, runtime proof, 12 E2E packs

    Note over P2,DH: 10:05 — C1 is still active
    P2->>DH: Take exact PR 2 head to Production
    DH->>P2: Target: Production / Queued for staging batch

    Note over P3,DH: 10:10 — C1 is still active
    P3->>DH: Take exact PR 3 head to Staging
    DH->>P3: Target: Staging / Queued for staging batch
    Note over DH: Latest pending controller run remains queued.<br/>Both exact requests remain in GitHub commit statuses.

    Note over DH,STG: 10:20 — C1 passes and becomes known-good H
    STG-->>DH: C1 deployed and staging E2E green
    DH->>P1: Target: Staging / Staging validated
    DH->>DH: Freeze manifest [PR 2 to Production, PR 3 to Staging]
    Note over DH: Different final targets become consecutive cohorts,<br/>not one mixed snapshot.
    DH->>STG: Production cohort C2 = current main + tracked PR 1 + PR 2
    DH->>P2: Target: Production / Deploying staging snapshot C2
    DH->>P3: Target: Staging / Queued behind active staging cohort

    Note over DH,STG: Around 10:40 — C2 passes and becomes known-good H2
    STG-->>DH: C2 runtime proof and staging E2E green
    DH->>P2: Staging validated, continuing to production

    par PR 2 production continuation
        DH->>PROD: Merge exact PR 2, freeze M2, deploy and run production E2E
        PROD-->>P2: Target: Production / Production complete
    and PR 3 uses the now-free staging lane
        DH->>STG: Staging cohort C3 = current main + tracked PRs 1 and 2 + PR 3
        DH->>P3: Target: Staging / Deploying staging snapshot C3
        STG-->>DH: C3 product failure
        DH->>STG: Restore current main + retained tracked PRs 1 and 2
        DH->>P3: Target: Staging / Not staged: product failure
    end
```

GitHub Actions owns the single active frontend staging lane. There is no agent
waiting in a loop and no Deploy Hub queue database. A newer pending controller
run may replace an older pending controller run; the exact PR requests remain
discoverable from their commit statuses, so the next run freezes the complete
pending manifest.

If PR 2 and PR 3 had the same final target, they would form one cumulative
snapshot and follow Diagram 3 on failure. Here, different targets are kept
separate so faulty staging-only PR 3 cannot contaminate PR 2's production
evidence or delay its production continuation.
