# 3. Staging failure reconciliation

Assume PR 1 already produced known-good staging content `H`. PR 2 and PR 3 have
the same final target, so they share the next snapshot
`C23 = H + PR 2 + PR 3`. The workflow first separates an infrastructure
failure from a product failure.

```mermaid
flowchart TD
    A["C23 fails deploy, runtime proof, or staging E2E"] --> B{"Infrastructure/transient failure?"}
    B -- "Yes" --> C["Retry the same exact C23 snapshot<br/>within a fixed budget"]
    C --> D{"Retry passes?"}
    D -- "Yes" --> D1["PR 2 and PR 3 staging-validated together<br/>C23 becomes known-good"]
    D -- "No" --> D2["Stop with infrastructure blocker<br/>Do not blame either PR"]

    B -- "No: product failure" --> E["Create non-force recovery commit R2<br/>content = H + PR 2"]
    E --> F["Canonical staging deploy + runtime proof + full E2E"]
    F --> G{"R2 product result"}
    G -- "Pass" --> H["PR 2 is staging validated<br/>R2 becomes known-good"]
    H --> H1["PR 3: not staged<br/>failed or incompatible after PR 2"]

    G -- "Fail" --> I["Create non-force recovery commit R3<br/>content = H + PR 3"]
    I --> J["Canonical staging deploy + runtime proof + full E2E"]
    J --> K{"R3 product result"}
    K -- "Pass" --> L["PR 3 is staging validated<br/>R3 becomes known-good"]
    L --> L1["PR 2: not staged<br/>product failure against H"]
    K -- "Fail" --> M["Create non-force recovery commit RH<br/>content = last known-good H"]
    M --> N["Canonical staging deploy + runtime proof + full E2E"]
    N --> O["PR 2 and PR 3 not staged<br/>staging restored to verified H content"]
```

Each replay candidate gets the same bounded infrastructure retry treatment; an
infrastructure error never becomes evidence that a PR is faulty.

The order is the original accepted-request order, not an inferred priority from
the final target. If `H + PR 2` passes after `H + PR 2 + PR 3` failed, the
minimal deterministic conclusion is that PR 3 failed or is incompatible with
the accepted PR 2 baseline. Deploy Hub does not spend another full cycle trying
PR 3 alone unless someone explicitly retries or reorders it.

If the shared target is Production, each surviving replay result becomes its
own exact production candidate. If the shared target is Staging, the survivor
simply stops after staging validation.
