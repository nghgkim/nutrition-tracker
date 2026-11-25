# Feature Spec: Actionable Empty State for Food Search (Tier 1 Patch)

**Status:** Draft
**Tier:** 1 (Bugfix — empty-state CTA)
**Date:** 2026-11-25
**Grounding:** `frontend-craftsman` 5-State UX; Don't Make Me Think

## 1. Problem & Context
Both food search surfaces show only instructional text when nothing matches:
- Library empty: "Thử từ khoá khác hoặc thêm món mới ở biểu mẫu phía trên."
- Crawler import empty: "Không có món nào để nhập."

User asked: when search returns nothing, why not give an "add new food" button right there.

### Five Whys
1. Why no button? Empty states were written as text only.
2. Why bad? User must leave the empty state, find the top "Thêm" button, and retype the name.
3. Why matters? Empty state is the exact moment of intent — a dead end loses it.
4. Why not caught? Prior audit checked presence of empty text, not actionability.
5. Why fix now? Owner flagged directly.
Root cause: **empty state without an actionable next step**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given library search with no results, When empty state renders, Then a button `Thêm món "<query>"` is present.
AC-2: Given that button, When clicked, Then add-food dialog opens with the name field prefilled with the query.
AC-3: Given crawler import dialog with no candidates, When empty state renders, Then `Thêm món "<query>"` button is present.
AC-4: Given that button, When clicked, Then import dialog closes, add dialog opens, name prefilled.
AC-5: Given empty query, When empty state renders, Then button label is "Thêm món mới" (no empty quotes).
AC-6: Given 390px, When CTA renders, Then touch >= 44px, no leak, dark mode clean.
AC-7: Given build/tests, When run, Then pass.

## 3. Architecture
```mermaid
flowchart LR
  QUERY[search query] --> HELPER[prefillFoodName pure]
  HELPER --> CTA[Thêm món "<name>"]
  CTA --> DIALOG[add-food form prefilled]
```
- Pure helper `prefillFoodName` in `src/lib/food-suggest.ts`, TDD tested (trim, cap 60, fallback label).
- Existing `setShowForm(true)` reused; no new API/schema.

### Verification harness
| Area | Type | Command |
|---|---|---|
| Pure helper | unit (TDD) | `npm test -- tests/food-suggest.test.ts` |
| UI | Playwright | search nonsense -> CTA -> dialog prefilled; 390px audit |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

### Failure modes
- Very long query -> helper caps at 60 chars (no overflow).
- Query with only spaces -> fallback generic label.

## 4. Contract / Schema
No change.

## 5. Data Schema
No change.

## 6. Trade-offs
- Rejected: text-only hint -> dead end (observed).
- Rejected: auto-create food on search -> fabricated nutrition. Chosen: open form prefilled; user still enters real values.

## 7. Takeaways
- CTA belongs at the point of intent, not one scroll away.
- Prefill from the user's own query is not fabrication — it is their input.

## 8. Security
Query rendered as escaped React text; no new path.

## 9. Performance SLA
Pure string helper; no measurable impact.

## 10. Evidence
- Spec judge: 93/100
- TDD red->green: prefillFoodName tests (trim, cap 60, blank fallback) written first; tests 80/80 PASS
- Both empty states now have CTA: library "Thêm món '<query>'" and crawler-import dialog "Thêm món '<query>'"; both call openAddWith() which closes import dialog, opens add dialog with prefilled name; user still enters real nutrition values (no fabrication)
- Playwright 390px: library CTA 44px, click -> prefilled "món lạ xyz123"; import CTA click -> dialog closed + prefilled "xyz-khong-co"; audit passed
- Build/typecheck/lint PASS; smoke 9/9; verify-ui 4/4; URL 200
