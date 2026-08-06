# 1. End-to-end frontend flow

This is the intended lifecycle of one explicit frontend request. Staging is
always the evidence gate; only a production target crosses into `main` and the
production workflow.

```mermaid
flowchart TD
    A["Human or agent: take FE PR N to target"] --> B["Submit PR number, exact head SHA, target, requester"]
    B --> C{"Identity, authority, PR head, and target valid?"}
    C -- "No" --> C1["Fail before mutation<br/>PR status shows stale or policy blocker"]
    C -- "Yes" --> D["Write PR status<br/>Queued for staging batch"]
    D --> E["Frontend controller freezes valid pending requests<br/>and partitions adjacent requests by final target"]
    E --> F["Compose from frozen current main + retained tracked PRs<br/>+ the next same-target cohort"]
    F --> G["Non-force update of 1a-staging"]
    G --> H["Canonical deploy-staging.yml"]
    H --> I["Prove exact staging runtime SHA"]
    I --> J["Run all 12 staging E2E packs"]
    J --> K{"Deploy, runtime, and E2E result"}
    K -- "Infrastructure failure" --> L{"Same-snapshot retry budget left?"}
    L -- "Yes" --> H
    L -- "No" --> L1["Stop with infrastructure blocker<br/>Preserve exact runtime truth"]
    K -- "Product failure" --> M["Bounded ordered staging replay<br/>from last known-good content"]
    M --> N{"Did this PR survive replay?"}
    N -- "No" --> N1["PR status<br/>Not staged: failed or incompatible"]
    N -- "Yes" --> O{"Requested final target"}
    K -- "Pass" --> O
    O -- "Staging" --> P["PR status<br/>Target: Staging / Staging validated"]
    P --> P1["Process the next staging cohort<br/>when present"]
    O -- "Production" --> Q1["Release staging lane for the next cohort<br/>production continues independently"]
    Q1 --> Q["Recheck exact PR head, current main,<br/>mergeability, checks, and production authority"]
    Q --> R{"Whole production batch passes preflight?"}
    R -- "No" --> R1["Stop before main mutation<br/>Report exact blocker"]
    R -- "Yes" --> S["Merge exact validated PR head or heads<br/>to main in deterministic order"]
    S --> T{"All intended merges completed?"}
    T -- "No" --> T1["Stop after partial main mutation<br/>Do not deploy production automatically"]
    T -- "Yes" --> U["Freeze resulting exact main SHA"]
    U --> V["Canonical build-upload-deploy-prod.yml"]
    V --> W["Prove exact production runtime SHA"]
    W --> X["Run all 11 production-safe E2E packs"]
    X --> Y{"Production result"}
    Y -- "Pass" --> Z["PR status<br/>Target: Production / Production complete"]
    Y -- "Infrastructure failure" --> Y1{"Same-main retry budget left?"}
    Y1 -- "Yes" --> V
    Y1 -- "No" --> Y3["Stop with infrastructure blocker<br/>Preserve exact main/runtime truth"]
    Y -- "Product or runtime failure" --> Y2["Stop and report exact main/runtime truth<br/>No automatic isolation or rollback"]
    Z --> Z1["Release notes continue asynchronously<br/>and never gate deployment truth"]
```

The feedback link always points to the authoritative workflow run. Deploy Hub
does not reimplement either frontend deploy workflow or either E2E suite.
