# ADR 0003 - UI Evidence Contract

- **Status:** Accepted
- **Date:** 2026-11-26
- **Scope:** all UI verification evidence under `docs/evidence/`

## Context

Fifty-four evidence folders recorded `passed: true` while
`detected_error_handler: false`, and all screenshots were captured on an
unauthenticated `/` redirect to `/login`. None of the real screens were
verified. The global gates in `kb` (ADRs 0001-0004 there) now enforce declared
states, a universal hit-area floor, fail-closed CI and a single implementation;
this repository adopts them.

## Grounding

- **Refactoring UI - Don't overlook empty states - p.203-205** (retrieved via `kb_retrieve_passages` in the audit session): the empty state "should be a priority, not an afterthought" and supporting UI should be hidden until content exists.
- **Tokens & specs [material-design-3] - Filled text field error states - p.1** (retrieved via `kb_retrieve_passages`): states are visual representations of interaction status; error messages display instructions to fix the problem.
- **Continuous Delivery - The Commit Stage > Summary - p.220-221** (retrieved via `kb_retrieve_passages`): the commit stage runs on every change and includes automated tests and metrics.

A report that marks PASS without an error state is not evidence; it is a false
green that hides the very states these sources require.

## Decision

1. `scripts/verify-ui.py` is a thin shim; the implementation is `gate ui verify`
   from `kb`. `gate.config.json` holds this repository's screen, states and
   viewports.
2. Evidence for authenticated screens uses `UI_STORAGE_STATE` at runtime. The
   session file is kept outside the repository; credentials are never committed.
3. An evidence report is accepted only when `certification.certified` is true,
   `login_redirects` is empty, and every declared state is detected. A real
   REJECT is preferred over a false PASS.
4. Stale reports that cannot satisfy this contract are removed rather than
   retained as history; git history remains the archive.
5. `docs/evidence/dashboard-auth-final/visual/report.json` is the current
   baseline: it is honestly REJECTed for a missing error state and three hit
   area violations (`Thêm` 82x20, two 32x32 icon buttons).

## Rejected alternatives

- **Patch the button classes and keep the old evidence.** Rejected: it fixes
  symptoms while leaving a gate that cannot detect the next regression.
- **Keep the 54 old reports with a warning note.** Rejected: consumers of the
  evidence directory cannot distinguish a warning from a passing gate.

## Consequences

- Adding a screen means adding a config entry and generating evidence with a
  valid storage state; reusing `/` while unauthenticated is no longer accepted.
- CI fails closed when `UI_BASE_URL` is absent.

## Verification

```bash
UI_STORAGE_STATE=/path/to/session.json gate ui verify \
  --base http://localhost:3001 --path /dashboard \
  --states empty,loading,error --screen dashboard
```
