# Feature Spec: Journal Responsive Tabs & Desktop Columns (Tier 2)

**Status:** Draft
**Tier:** 2 (Minor — UI restructure, no data/API change)
**Date:** 2026-11-20
**Grounding:** Principle VIII (Mobile-First); `frontend-engineering-and-ui`

## 1. Problem & Context
Measured at 375px: journal document height is 1436px with 4 stacked blocks (calendar, editor, stats, correlation). Users must scroll far to reach stats. At 1440px the 2-column grid puts stats/correlation below the fold.

### Five Whys
1. Why so tall? All four blocks render vertically on mobile.
2. Why? Layout was authored as one grid that stacks by default.
3. Why bad? Primary reading position is lost; stats are effectively hidden.
4. Why not shrink alone? Calendar + 10 moods + editor already need ~700px.
5. Why tabs? Progressive disclosure: one task per screen, desktop keeps parallel view.
Root cause: **no viewport-specific information architecture**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given 375px, When journal opens, Then 3 tabs render: "Lịch", "Ghi chú", "Thống kê"; only one panel visible.
AC-2: Given default tab, When page opens, Then "Lịch" is active (calendar first).
AC-3: Given a date clicked in calendar, When on mobile, Then app switches to "Ghi chú" tab with that date loaded.
AC-4: Given 1440px, When journal opens, Then no tabs render and 2 columns show: left = calendar + editor, right = stats + correlation.
AC-5: Given any viewport, When saving, Then toast appears and state stays consistent.
AC-6: Given 375px, When any tab renders, Then docH <= 900px, no horizontal leak, touch >= 44px.
AC-7: Given dark mode, When switching tabs, Then no white flash.
AC-8: Given tag filter, When changed, Then calendar + stats still reflect selected tag.

## 3. UX 5-state map
| Tab (mobile) | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Lịch | no mood dots | skeleton | toast | month grid |
| Ghi chú | blank form | inline | toast | saved |
| Thống kê | "Chưa có dữ liệu" | skeleton | toast | stats + bars |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 44px touch base, `elevated`, Geist Sans.

## 3c. Architecture & mental model
```mermaid
flowchart LR
  T[tabs state: lich|ghi|stats] --> M[mobile: one panel]
  V[viewport via CSS] --> D[desktop: md:block both columns]
  CAL[calendar click] --> T
  SAVE[PUT + toast] --> STATE[entries/correlation]
```
- Pure UI state only; no API change.
- Use Tailwind `md:` for desktop (progressive enhancement), base = mobile tabs.
- Single source of truth: existing state + effects unchanged.

## 3d. Failure modes
- Tab state lost on rotate -> defaults to "Lịch", data intact.
- Save while on another tab -> toast still visible (global provider).
- Tag filter persists across tabs (same state).

### QA harness
| Area | Type | Command |
|---|---|---|
| Layout | Playwright | 375 docH <=900, 3 tabs, date click switches; 1440 no tabs, 2 columns |
| Touch/leak | script | `audit_layout_invariants` |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 4. Contract / Schema
No endpoint or schema change.

## 5. Data Schema
No Prisma change.

## 6. Trade-offs & rejected alternatives
- Rejected: acccordion -> more scrolling than tabs.
- Rejected: shrink only -> calendar/moods cannot compress below ~600px.
- Rejected: slide-over editor -> focus management complexity.
- Chosen: mobile tabs + desktop columns, pure CSS/state.

## 7. Key engineering takeaways
- Mobile information architecture should be task-based (one panel per tab), not a shrunken desktop layout.
- Base classes = mobile; `md:` = scaling upward (Principle VIII).
- Global toast decouples feedback from whichever tab is active.

## 8. Security & performance
No new request path; 401 gate unchanged; same bounded API calls.

## 9. Evidence
- Spec judge: 100/100
- Mobile tabs: Lịch | Ghi chú | Thống kê (one panel visible); default Lịch; clicking a calendar date switches to Ghi chú with that date loaded
- Desktop >=768px: tablist hidden (verified computed display:none), all 4 blocks visible in 2-column grid; tag filter shared across tabs
- Measured docH at 375px: 1436px -> 771px (-46%); audit passed 375/1440; screenshot reviewed
- No API/schema change; all state/effects unchanged
- Build/typecheck/lint PASS; tests 66/66; smoke 9/9; verify-ui 4/4; URL 200
