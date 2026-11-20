# Feature Spec: Complete 5-State UX on Data Pages (Tier 2)

**Status:** Draft
**Tier:** 2 (Minor — error/empty states, no API change)
**Date:** 2026-11-20
**Grounding:** `frontend-craftsman` skill (5-State UX Architecture); Don't Make Me Think

## 1. Problem & Context
Audit of 13 pages found:
- Most pages have loading skeleton + empty message.
- **`/insights` and `/what-to-eat` have no error state**: a failed `fetch` leaves `data === null` (infinite skeleton) or throws on `.json()`.
- `/settings` uses `msg` inline text but no visible error banner for read failures.
- `/profile` has loading + toast but no error banner if initial Promise.all fails (stuck skeleton).

### Five Whys
1. Why stuck skeleton? `load()` has no `catch`; `setLoading(false)` never runs on failure.
2. Why no error UI? Pages were built happy-path first.
3. Why matters? Network/server error = blank screen with no retry — violates 5-state invariant.
4. Why not caught? Smoke only checks HTTP 200 paths.
5. Why fix now? Owner asked to improve the whole app; skill checklist demands all 5 states.
Root cause: **loading promise chains without failure path**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given a failed data fetch on `/insights`, When it errors, Then an inline error banner with "Thử lại" button appears (no infinite skeleton).
AC-2: Given retry clicked, When pressed, Then `load()` re-runs and a skeleton shows during retry.
AC-3: Given `/what-to-eat`, When `loadWte()` or restaurant fetch fails, Then an error banner appears; previous restaurant list kept.
AC-4: Given `/profile`, When initial Promise.all fails, Then error banner + retry appears instead of stuck skeleton.
AC-5: Given success after error, When data loads, Then banner disappears and normal UI renders.
AC-6: Given 375px, When error banner renders, Then touch target >= 44px, no horizontal leak, dark mode clean.
AC-7: Given build/tests, When run, Then all pass.

## 3. UX 5-state map
| Page | Loading | Empty | Error | Populated | Partial |
|---|---|---|---|---|---|
| insights | skeleton | "Chưa có dữ liệu" | banner + retry | charts | — |
| what-to-eat | skeleton | "Không tìm thấy" | banner + retry | cards | stale list kept |
| profile | skeleton | defaults | banner + retry | form | — |

## 3b. Design tokens
Emerald primary, Nordic light/dark, destructive for error banner, 44px touch base.

## 3c. Architecture & mental model
```mermaid
flowchart LR
  LOAD[async load] --> OK[setData + setLoading false]
  LOAD --> ERR[catch -> setError(message) + setLoading false]
  ERR --> BANNER[ErrorBanner + Thử lại]
  BANNER --> LOAD
```
- Pure presentational `ErrorBanner` component shared across the 3 pages (in `src/components/ErrorBanner.tsx`).
- No new endpoint; retry reuses existing load functions.

## 3d. Failure modes
- Retry storm -> button disabled while loading (reuse `loading` state).
- Error message from API may be JSON `{error}` -> parse safely with fallback text.
- Dark mode -> banner uses destructive/10 themed colors.

### QA harness
| Area | Type | Command |
|---|---|---|
| UI error | Playwright | intercept API -> 500, assert banner + retry; click retry -> 200 -> content |
| Touch/leak | script | `audit_layout_invariants` at 375px |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 4. Contract / Schema
No endpoint or schema change.

## 5. Data Schema
No Prisma change.

## 6. Trade-offs & rejected alternatives
- Rejected: infinite skeleton -> user cannot recover.
- Rejected: global error boundary only -> loses page context; inline banner keeps layout.
- Chosen: shared ErrorBanner + per-page error state with retry.

## 7. Key engineering takeaways
- Every async load needs a failure path; happy-path-only is a 4th of 5 states.
- Retry must re-invoke the same loader (no duplicated fetch logic).
- A shared presentational error component keeps messaging consistent.

## 8. Security & performance
No new request path; 401 gate unchanged; error messages rendered as escaped React text.

## 9. Performance SLA
Error path adds one state update; no measurable impact.

## 10. Evidence
- Spec judge: 93/100
- Shared ErrorBanner component (role=alert, destructive/10 themed, 44px retry with spinner while retrying)
- Applied error states: /insights (skeleton -> banner on fetch fail), /what-to-eat (banner above list, old list kept), /profile (banner instead of stuck skeleton); retry reuses each page's load function
- Playwright: intercepted /api/insights -> 500, banner "Không thể tải dữ liệu tiến độ..." appears, audit 375px passed; unroute + click Thử lại -> banner gone, chart "Nạp vs Đốt" renders, no skeleton
- Fixed missing useCallback import in profile after refactor
- Build/typecheck/lint PASS; tests 66/66; smoke 9/9; gate audit PASSED; verify-ui 4/4; URL 200
