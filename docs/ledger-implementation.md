# Git Ledger Implementation Notes

Status: Task 6 implementation boundary

Date: 2026-08-03

## What exists now

`RequestLedger` implements the accepted `state/v1` semantics behind a tiny
Git-repository port:

- one immutable request and acceptance event per deployment or validation;
- one new event and one regenerated snapshot per state change;
- one non-force compare-and-swap update per ledger commit;
- identical request replay without a write and conflicting reuse rejected;
- deterministic waiting order by acceptance sequence and subject ID;
- exact deployment SHA and validation snapshot checks during reconciliation;
- replay validation of request digests, event chains, global sequence, and
  byte-equivalent snapshots.

The current adapter is intentionally in memory. It simulates Git commits,
parent heads, non-force conflicts, complete trees, and retained history. It has
no URL, token, network client, GitHub write, workflow dispatch, state branch,
or environment capability. A live GitHub Git-database adapter and creation of
the protected `refs/heads/state/v1` branch remain later permission-gated work.

## Retention and audit history

Normal operation never edits or deletes `request.json` or an event file. The
current `snapshot.json` and `meta.json` are replaceable caches in the head tree;
their older bytes remain in Git commit history. Replay must reproduce every
current snapshot exactly, and a mismatch fails closed.

MVP has no compaction job. Compaction that removes request or event history
would violate ADR 0006. The directory layout is the index: subject paths locate
one operation, and acceptance sequence plus subject ID derives queue order.
Any later archive or storage change requires a versioned migration preserving
the v1 history and digests.

## Size and operation behavior

At the branch head, `N` accepted subjects with no later events occupy exactly
`1 + 3N` files: one metadata file plus one request, acceptance event, and
snapshot per subject. Each later transition adds one event file and replaces
the subject snapshot. Tests exercise 50 subjects, verify this formula, and
confirm linear head-byte growth with the normative request fixture.

Each new state commit performs one compare-and-swap cycle; a helper may first
read the record to check its preconditions. An identical request replay performs
a read and no write. A conflict causes a complete reread and reevaluation,
bounded to three attempts. These are semantic operation counts, not yet claims
about the number or latency of REST calls in a future GitHub adapter. Task 18
will add observed production metrics; a sustained size, latency, or rate
problem is the ADR 0006 trigger for revisiting the storage choice.

## Recovery behavior

After process loss, a new `RequestLedger` instance reads the same Git tree,
replays the durable event chain, and derives the same waiting owner and
snapshot. Missed terminal callbacks are recovered from exact GitHub evidence.
Duplicate evidence is idempotent; the same evidence identity with different
content fails closed. Reconciliation can advance only the already accepted SHA
or validation snapshot and never follows a moved branch.
