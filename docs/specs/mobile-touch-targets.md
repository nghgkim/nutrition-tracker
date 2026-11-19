# Feature Spec: Mobile Touch-Target Invariant Fix (Tier 1 Patch)

**Status:** Draft
**Tier:** 1 (Bugfix — CSS/layout only, no new domain logic)
**Date:** 2026-11-19
**Grounding:** Constitution Principle VIII (Mobile-First & Touch Ergonomics); WCAG SC 2.5.5; Apple HIG

## 1. Problem & Context (Five Whys)
Audit with the updated `scripts/ui-checks/check_layout.py` at 375x667 found touch violations on **every** page: nav "Thêm" 40x28, "Thêm" 73x28, "← Trước" 54x20, "Dùng vị trí" 98x30, "Trước/Tiếp" 58x30, "7 ngày/30 ngày" 65x32.

1. **Why do controls fail the gate?** Their bounding boxes are 20-32px tall.
2. **Why are they that small?** Tailwind utilities `py-1`, `py-1.5` and `text-xs` were authored desktop-first for density.
3. **Why was that not caught earlier?** The old `verify-ui.py` only checked 600px+ viewports; mobile 375/390 was added in the governance update.
4. **Why did desktop-first styles survive?** Base classes were written for desktop and never scaled up with `md:` prefixes, violating Principle VIII.
5. **Why does it matter?** 28px targets force precise tapping, cause mis-taps and fail WCAG 2.5.5 / HIG — a real usability defect on the primary device.

Root cause: **no enforced mobile base rule for interactive element sizing**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given a 375x667 viewport, When any interactive button is measured, Then height and width are >= 36px (gate threshold) with 44px target where layout permits.
AC-2: Given all feature pages (dashboard, foods, what-to-eat, insights, history, profile), When `audit_layout_invariants` runs, Then `passed == true` and `touch_violations == []`.
AC-3: Given desktop 1440px, When the same elements render, Then they keep the original compact sizing (no visual regression).
AC-4: Given zero-horizontal-leak invariant, When mobile audit runs, Then `scrollWidth <= clientWidth` remains true.
AC-5: Given dark mode, When mobile audit runs, Then no white flash occurs.

## 3. UX 5-state map
No new screen; only hit-area changes for existing controls.

## 3b. Design tokens
Emerald primary, Nordic light/dark, 4/8/12/16/24px spacing, `elevated`, Geist Sans. Touch target 44px base / 36px gate floor.

## 3c. Architecture & mental model
```mermaid
flowchart LR
  CSS[globals.css base rules] --> B[button min 44px]
  CSS --> S[select/input min 44px]
  MQ[@media min-width 768px] --> D[desktop compact sizing]
  B --> A[check_layout.py audit at 375/390]
  S --> A
  A --> R[report.json passed / violations]
```
- Pure CSS change; no API, no state, no DB. `md:` / `min-width: 768px` is progressive enhancement upward only.
- No concurrency concerns.

## 3d. Failure modes & resilience
- Very dense controls (pagination) may wrap; `flex-wrap` already present.
- Long nav on narrow screens: icon-only labels remain hidden via `sm:` as before; hit area still >= 36px.
- If a future component sets an explicit smaller height, the base `min-height` still wins (specificity: same or higher via utility layer order).

## 3e. QA matrix & harness
| Area | Type | Command |
|---|---|---|
| Mobile invariants | script | `python3 /tmp/opencode/audit-mobile.py` (audits 6 pages at 375px) |
| Full UI gate | script | `python3 scripts/verify-ui.py http://localhost:3001 touch-fix` |
| Regression | full | `npm run build && typecheck && lint && test && smoke && verify:ui` |

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/restaurants | limit, offset, district, maxPrice | { restaurants, total } | 401 |

No endpoints added or modified — this is a CSS-only fix; the table above lists the contract exercised by the QA pages.

## 5. Data Schema
| Model | Field | Change |
|---|---|---|
| — | — | No Prisma model or column change |

UI-only: base CSS rule in `src/app/globals.css`, no new state/fields.

## 6. Trade-offs & rejected alternatives
- Rejected: patch each button component individually -> 6+ files, easy to miss future controls; global base rule is one place and self-enforcing.
- Rejected: `min-height: 44px` on desktop too -> wastes vertical space and regresses dense tables; scoped mobile base + `min-width: 768px` override keeps desktop unchanged.
- Rejected: lower the audit threshold to 28px -> hides the defect instead of fixing it (violates Zero Suppression).

## 7. Key engineering takeaways
- Author CSS mobile-first: base = smallest screen; breakpoints only scale upward.
- A single base invariant beats per-component patches when the constraint is universal (hit area).
- A QC gate added after the fact will surface latent defects across the whole app — expect a batch fix.

## 8. Evidence
- Root cause (Five Whys): desktop-first `py-1/py-1.5` utilities with no mobile base sizing rule; the new 375px gate exposed it across all 6 pages
- Fix: base CSS `button, [role=button], input[type=submit|button], select { min-height/min-width: 44px }` in `src/app/globals.css`, desktop compact sizes restored at `@media (min-width: 768px)`
- Secondary defect found: `/foods` header "Thêm" button overflowed at 375px (right=414) -> added `flex-wrap` to header + control group and `w-full sm:w-56` search input
- Audit `python3 scripts/ui-checks/check_layout.py` via Playwright at 375x667: 6/6 pages pass, 0 touch violations, no horizontal leak
- Unified `verify-ui.py`: 4/4 viewports (375/390/768/1440) pass, 0 touch violations
- Build/typecheck/lint PASS; tests 31/31; smoke 9/9; URL HTTP 200
- Takeaway: one universal base invariant beats per-component patches; QC gates added later expose latent cross-app defects
