# 4. Mixed targets and production batching

## Example A — PR 2 targets production; faulty PR 3 targets staging

Both targets require staging evidence, but they do not share one staging
snapshot. The frozen request manifest is partitioned into adjacent same-target
cohorts, then the staging and production lanes overlap safely.

```mermaid
flowchart TD
    A["Frozen pending manifest<br/>1. PR 2 target = Production<br/>2. PR 3 target = Staging"] --> B["Partition by adjacent final target"]
    B --> C["Production cohort C2<br/>content = current main + retained tracked PRs + PR 2"]
    B --> D["Staging cohort C3 waits<br/>until staging lane is free"]
    C --> E["C2 deploy, runtime proof,<br/>and full staging E2E pass"]
    E --> F["PR 2 status<br/>Target: Production / Staging validated"]
    F --> G["Production lane<br/>preflight and merge exact PR 2 to main"]
    G --> H["Freeze M2, deploy production,<br/>prove runtime, run full production E2E"]
    H --> I["PR 2 status<br/>Target: Production / Production complete"]
    E --> J["Release staging lane to C3<br/>while PR 2 continues independently"]
    D --> J
    J --> K["C3 = current main + retained tracked PRs + PR 3"]
    K --> L["C3 has a product failure"]
    L --> M["Restore current main + retained tracked PRs<br/>through a non-force recovery commit"]
    M --> N["PR 3 status<br/>Target: Staging / Not staged:<br/>product failure"]
```

PR 3 cannot contaminate PR 2's staging evidence, hold its production
continuation, or accidentally reach production. Once C2 passes, production and
the next staging cohort use independent concurrency lanes.

## Example B — two production PRs batch; staging-only PR stays separate

```mermaid
flowchart TD
    A["Frozen pending manifest<br/>PR 2 target = Production<br/>PR 4 target = Production<br/>PR 5 target = Staging"] --> B["Adjacent production cohort C24<br/>separate staging cohort C5"]
    B --> C["C24 = current main + retained tracked PRs<br/>+ exact PR 2 + exact PR 4"]
    C --> D["Shared staging deploy, runtime proof,<br/>and full staging E2E pass"]
    D --> E["Production candidate set<br/>exact PR 2 head + exact PR 4 head"]
    E --> F{"Preflight every candidate against<br/>the same current main and merge order"}
    F -- "Any failure" --> G["Merge none<br/>report exact blocker"]
    F -- "All pass" --> H["Merge PR 2 then PR 4 to main"]
    H --> I{"Both intended merges complete?"}
    I -- "Unexpected partial failure" --> J["Stop; report exact main truth<br/>do not start production"]
    I -- "Yes" --> K["Freeze exact resulting main SHA M24"]
    K --> L["One canonical production deploy of M24"]
    L --> M["One runtime proof + one full production E2E run"]
    M --> N{"Production result"}
    N -- "Pass" --> O["PR 2 and PR 4<br/>Target: Production / Production complete"]
    N -- "Fail" --> P["Both link the same exact failure evidence<br/>no automatic PR isolation or rollback"]
    D --> Q["Release staging lane to separate C5<br/>while C24 continues to production"]
    Q --> R["PR 5 receives its own staging result<br/>and can never enter production"]
```

The production batch is one adjacent production-target cohort with one shared
passing staging snapshot. PR 5 is not part of that evidence or production
content. If a staging-target request sits between PR 2 and PR 4 in accepted
order, they become separate cohorts rather than allowing PR 4 to overtake it.
PRs validated in separate staging snapshots are never automatically recombined
for production.
