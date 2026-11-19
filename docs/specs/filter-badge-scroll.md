# Feature Spec: Filter Badge Count & Panel Scroll (Tier 2)

**Status:** Draft
**Tier:** 2 (Minor — UI refinement + pure helper)
**Date:** 2026-11-19
**Grounding:** Principle VII (Five Whys, Mermaid, trade-offs); Principle VIII (mobile viewport)

## 1. Problem & Context
- Badge currently counts the district group as 1 regardless of how many districts are selected, understating the actual filter breadth.
- On 375px, 10 district checkboxes + 5 other controls make the popover taller than the viewport.

### Five Whys
1. Why is the badge misleading? It counts controls, not selected values.
2. Why is that confusing? Selecting 5 districts still shows "(1)".
3. Why is the panel tall? All 10 district buttons render inline in a wrapped group.
4. Why does that hurt? On a 667px-tall viewport the popover can exceed the screen.
5. Why fix now? Owner asked to continue both improvements.
Root cause: **badge semantics and panel height were not designed for multi-value inputs**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given 3 districts and no other filters, When rendered, Then the badge shows "(3)".
AC-2: Given 3 districts + rating 8 + price range, When rendered, Then the badge shows "(5)" (3 + 1 + 1).
AC-3: Given sort changed from default, When rendered, Then it is counted as 1 value.
AC-4: Given 375x667, When the panel opens, Then `maxHeight <= viewport - 120px` with internal vertical scroll and no document horizontal leak.
AC-5: Given the panel, When scrolling internally, Then controls remain clickable and the close button stays reachable.
AC-6: Given 1440px, When the panel opens, Then it remains a compact popover with the same badge semantics.

## 3. UX 5-state map
| State | Badge | Panel |
|---|---|---|
| No filters | no badge | closed |
| 1 value | (1) | open |
| Many values | (N) | open, scrollable if tall |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 44px touch base, `elevated`.

## 3c. Architecture & mental model
```mermaid
flowchart LR
  S[filter state] --> H[pure countActiveFilterValues]
  H --> BADGE[button label (N)]
  P[panelOpen] --> MAX[CSS max-height + overflow-y-auto]
```
- Pure helper in `src/lib/filter-badge.ts`, unit-tested TDD; no API change.
- Panel uses `max-h-[calc(100vh-120px)] overflow-y-auto` — out of flow, no layout shift (earlier invariant preserved).

## 3d. Failure modes & resilience
- Zero filters -> no badge text.
- Very small viewport -> internal scroll, never unreachable close button (sticky header inside panel).
- Stale `geo` -> distance controls still disabled; counting unchanged.

## 3e. QA matrix & harness
| Area | Type | Command |
|---|---|---|
| Pure helper | unit (TDD) | `npm test -- tests/filter-badge.test.ts` |
| UI | Playwright | badge after multi-check, panel box height, audit |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/restaurants | district (repeatable), filters, sort, paging | { restaurants, total } | 401 |

No endpoint change.

## 5. Data Schema
No Prisma change.

## 6. Trade-offs & rejected alternatives
- Rejected: keep control-based badge -> undercounts multi-value filters (observed confusion).
- Rejected: hide some district buttons behind "Xem thêm" -> extra interaction; scroll is simpler.
- Rejected: fixed pixel max-height -> breaks on short viewports; `calc(100vh-120px)` adapts.
- Chosen: value-based count + adaptive internal scroll.

## 7. Key engineering takeaways
- Badge counts should reflect user-visible selections, not internal control structure.
- Overlay panels need an internal scroll budget on mobile; otherwise controls become unreachable.
- Keep overlays out of flow while adding scroll so the no-shift invariant survives.

## 8. Security & performance
- 401 gate unchanged; no new input path.
- Pure computation + CSS only; no extra requests.

## 9. Evidence
- Spec judge: 93/100
- TDD red->green: tests/filter-badge.test.ts (4 tests) written first; countActiveFilterValues counts each district + each scalar + non-default sort; tests 38/38 PASS
- Playwright 375px: badge shows (3) for 3 districts, (4) after adding rating; panel max-height calc(100vh-120px) with internal scroll verified at both 667px (no scroll) and 500px (scrollable); sticky panel header; audit passed
- No layout shift: panel remains absolute out of flow (earlier invariant preserved)
- Build/typecheck/lint PASS; smoke 9/9; verify-ui 4/4 viewports PASS; URL HTTP 200
