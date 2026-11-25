# Feature Spec: Profile Save Availability & Null Handling (Tier 1 Patch)

**Status:** Draft
**Tier:** 1 (Bugfix — two root causes)
**Date:** 2026-11-25
**Grounding:** Principle VII (Five Whys); 5-state UX

## 1. Problem & Context
User reported pressing "Lưu hồ sơ" but nothing saved. Investigation found **two defects**:

### Five Whys
1. Why nothing saved? For a user with no weight/height/age, the save button is not in the DOM at all — it lives inside `{hasData && (...)}`.
2. Why inside hasData? It was grouped with the BMI/calorie results card.
3. Why is that wrong? Saving profile inputs must be independent of whether derived metrics can be computed.
4. Second defect: clearing a field sends `null`, but API does `Number(null) === 0`, storing 0 instead of NULL — reload shows empty (0 is falsy) but BMR math sees 0.
5. Why now? Owner observed the symptom directly.
Root cause: **save action coupled to derived-data availability + sloppy numeric coercion**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given empty profile (no weight logs), When page loads, Then "Lưu & cập nhật mục tiêu calo" is visible and enabled.
AC-2: Given user fills height/age, When save clicked, Then API returns 200, toast appears.
AC-3: Given reload, When page loads, Then saved height/age are shown in the inputs.
AC-4: Given user clears a numeric field, When saved, Then DB stores NULL (not 0) and reload shows empty.
AC-5: Given hasData false, When save clicked, Then goal is not invented — only provided fields are written; no fabricated 1200 floor persisted as a "result".
AC-6: Given 375px, When button renders, Then touch >= 44px, no leak, dark mode clean.
AC-7: Given build/tests, When run, Then pass.

## 3. Architecture
```mermaid
flowchart LR
  FORM[profile inputs] --> SAVE[saveProfile]
  SAVE --> PUT[/api/profile with null-safe values]
  SAVE --> GOAL[PUT /api/goal only when target computable]
  PUT --> RELOAD[loadProfile rehydrates]
  X[button inside hasData] -.-> FIX[button always visible]
```
- Move save button out of `{hasData && ...}` block, keep results card conditional.
- Pure helper `toNullableNumber` in `src/lib/profile-values.ts`, TDD tested: ""/null/undefined -> null; numeric string -> number; invalid -> null.
- API uses helper instead of `Number(...)`; only computes goal when `hasData`.

### QA harness
| Area | Type | Command |
|---|---|---|
| Pure helper | unit (TDD) | `npm test -- tests/profile-values.test.ts` |
| UI | Playwright | empty profile: button visible; save; reload values persist; clear -> NULL |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 4. Contract (REST)
`PUT /api/profile` unchanged shape; null now stored as NULL instead of 0 (fix, not contract break).

## 5. Data Schema
No migration; existing 0 values remain (not backfilled — harmless).

## 6. Trade-offs & rejected alternatives
- Rejected: require weight before showing save -> blocks legitimate partial saves (observed bug).
- Rejected: keep `Number(null)` -> 0 pollution. Chosen: null-safe helper.
- Rejected: persist 1200 floor goal when no data -> fabricated target. Chosen: skip goal PUT when not computable.

## 7. Takeaways
- An action must not be gated on unrelated derived-state availability.
- `Number(null) === 0` is a classic coercion trap; normalize at the boundary.
- Verify presence of the button in DOM before blaming the click handler.

## 8. Security & performance
401 gate unchanged; helper is pure; no new request path.

## 9. Performance SLA
Two PUTs as before; no measurable change.

## 10. Evidence
- Spec judge: 95/100
- TDD red->green: tests/profile-values.test.ts written first; toNullableNumber maps ''/null/undefined/invalid -> null and keeps numbers; tests 68/68 PASS
- Root cause 1 confirmed via DOM: save button was inside {hasData && (...)} so absent for users without weight/height/age; moved out, always visible
- Root cause 2: API Number(null)===0 stored 0 on cleared fields; now uses toNullableNumber -> NULL verified live
- saveProfile now checks res.ok for both PUTs, skips goal PUT when hasData false (no fabricated 1200 target), calls loadProfile() to rehydrate, shows error toast on failure
- Playwright: fill height 175 / age 31 -> save -> toast "Đã lưu hồ sơ và mục tiêu" -> reload shows 175/31; clear via API -> NULL/NULL
- Reinstalled node_modules (was missing) before QC; build/typecheck/lint PASS; smoke 9/9; verify-ui 4/4; URL 200
