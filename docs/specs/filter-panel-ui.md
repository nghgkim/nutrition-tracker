# Feature Spec: Consolidated Filter Panel (Tier 2)

**Status:** Draft
**Tier:** 2 (Minor — UI restructure, no API change)
**Date:** 2026-11-19
**Grounding:** Principle VII (Mermaid, trade-offs); Principle VIII (Mobile-First, thumb zone)

## 1. Problem & Context
Six filter/sort controls are laid out in a wrapping row; on 375px they occupy 3 lines and look cluttered. Owner asked to improve.

### Five Whys
1. Why does it look cluttered? Six selects + location button stack into 3-4 rows.
2. Why? Controls were added incrementally, each as a new select in the same row.
3. Why is that bad? Primary task (browse venues) is pushed below the fold by configuration UI.
4. Why not just shrink them? Touch targets must stay >= 44px.
5. Why a panel? It hides configuration by default and keeps the primary action visible.
Root cause: **configuration controls given the same visual weight as content**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given the restaurant view, When rendered, Then the header shows only "Dùng vị trí" and "Bộ lọc (N)" where N = count of active filters.
AC-2: Given "Bộ lọc", When tapped, Then a panel opens with all 6 controls (quận, Từ, Đến, sort, rating tối thiểu, khoảng cách tối đa) plus "Xóa tất cả".
AC-3: Given the panel, When "Xóa tất cả" is tapped, Then all filters reset to defaults and page returns to 1.
AC-4: Given the panel, When a control changes, Then results update immediately (no separate Apply button) and the badge count updates.
AC-5: Given a 375px viewport, When the panel opens, Then controls are stacked, touch targets >= 44px, no horizontal leak, and the panel does not cover the venue list permanently (closable).
AC-6: Given 1440px, When the panel opens, Then it renders as a compact popover near the button.
AC-7: Given dark mode, When the panel opens, Then no white flash.

## 3. UX 5-state map
| State | Filter panel |
|---|---|
| Closed | button "Bộ lọc (N)" |
| Open | 6 controls + Xóa tất cả |
| Active filters | badge N > 0 |
| Empty result | list empty state, panel stays open |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 44px touch base, `elevated`, Geist Sans.

## 3c. Architecture & mental model
```mermaid
flowchart LR
  BTN[Bộ lọc (N)] --> PANEL[panel state]
  PANEL --> C[6 controls bound to existing state]
  C --> API[GET /api/restaurants?filters]
  C --> BADGE[N = active count]
  PANEL --> RESET[Xóa tất cả -> defaults + page 1]
```
- No API change; controls reuse existing state/deps (already triggers `loadRestaurants(1)`).
- Panel is local UI state; no persistence.

## 3d. Failure modes & resilience
- Stale generation/request-key guards retained; rapid changes still discard stale responses.
- Panel open during filter change -> stays open, results update behind it.
- Outside click closes panel (mobile: explicit close button).
- No data loss: closing panel keeps active filters.

## 3e. QA matrix & harness
| Area | Type | Command |
|---|---|---|
| Panel UI | Playwright | 375/390/1440: open/close, badge, reset |
| Touch/leak | script | `audit_layout_invariants` |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/restaurants | district, minPrice, maxPrice, minRating, maxDistance, lat, lon, sort, limit, offset | { restaurants, total } | 401 |

No endpoint change.

## 5. Data Schema
No Prisma change.

## 6. Trade-offs & rejected alternatives
- Rejected: horizontal scrolling row -> still cluttered and hides controls off-screen.
- Rejected: "advanced" disclosure with two rows -> still 4 controls always visible; user asked for one button.
- Rejected: bottom sheet on mobile -> needs focus management and gesture handling; a stacked panel is simpler and accessible.
- Chosen: single button + panel, works identically on mobile/desktop.

## 7. Key engineering takeaways
- Progressive disclosure: configuration belongs behind a control, content first.
- Badge count gives at-a-glance state without opening the panel.
- Reuse existing state wiring; restructuring UI should not touch the data layer.

## 8. Security & performance
- 401 gate unchanged; no new endpoint or input path.
- Panel render is pure React state; no extra requests until a filter actually changes.

## 9. Evidence
- Spec judge: 93/100
- Playwright 375/1440: header shows only 2 buttons; panel opens with 6 selects; changing rating shows badge "Bộ lọc (1)"; "Xóa tất cả" resets badge; close button hides panel; audit passed (no leak, touch >= 44px)
- Screenshot reviewed: venue list visible immediately, configuration hidden behind the filter button
- No API change; existing state wiring and race guards untouched
- Build/typecheck/lint PASS; tests 32/32; smoke 9/9; verify-ui 4/4 viewports PASS; URL HTTP 200
