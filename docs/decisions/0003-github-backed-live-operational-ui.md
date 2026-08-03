# ADR 0003: GitHub-Backed Live Operational UI

Status: Accepted

Date: 2026-08-03

## Context

Deploy Hub needs a substantially better operational UI without coupling UI
releases to backend repository deployments. The UI must also show new
operations, queue changes, progress, failures, and terminal results as they
happen; requiring a browser refresh would fail the product requirement.

## Decision

The `deploy-hub` repository owns the static UI files on its `main` branch. The
existing backend exposes them under `/deploy/ui/hub` through an authenticated
proxy with narrowly scoped read access to the private repository.

For each served release, the proxy resolves `deploy-hub/main` to an exact commit
SHA and serves every HTML, CSS, and JavaScript file from that same SHA. It
caches files and switches releases atomically when the resolved `main` SHA
changes. Publishing the UI therefore requires a merge to `deploy-hub/main`, not
a backend code deployment. The UI displays its exact source SHA.

Static-file delivery and live operational data are separate paths. After
loading, the browser fetches an authenticated state snapshot and subscribes to
a server-sent event stream for deployment and queue changes. Commands continue
to use authenticated HTTP endpoints. The browser reconnects automatically and
fetches a fresh snapshot after interruption so that missed events cannot leave
the screen stale. A bounded automatic-polling fallback preserves no-refresh
behavior where the live stream is temporarily unavailable.

## Consequences

- The first version needs no S3 or CloudFront UI publishing pipeline.
- GitHub is the static UI origin, while the Deploy Hub API remains the source of
  operational state.
- The backend needs read-only contents access to the private `deploy-hub`
  repository and must not expose its credential to the browser.
- UI changes can be rolled back by selecting or restoring a known-good exact
  `deploy-hub` commit.
- Live-update transport is one-way and simple; retry and cancel remain ordinary
  authorized API calls rather than WebSocket commands.
- S3 or CDN publishing remains a future optimization if GitHub-origin latency,
  availability, or traffic becomes material.
