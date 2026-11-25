# Feature Spec: Persist Goal Mode (Tier 2)

**Status:** Draft
**Tier:** 2 (Minor — schema field + API + UI hydration)
**Date:** 2026-11-25
**Grounding:** Principle VII (Five Whys); `database-modeling-and-access`

## 1. Problem & Context
User selects "Tăng cân" (gain), saves, reloads — selection returns to "Duy trì". `goal` mode is local React state initialized to `"maintain"`; only `dailyCalories` is persisted.

### Five Whys
1. Why reset? State is never loaded from server.
2. Why not loaded? `/api/goal` returns only `dailyCalories`; no mode field in DB.
3. Why wasn't it caught? Save succeeds (calories change) so no error surfaced; only UI selection silently resets.
4. Why matters? The chosen intent is lost; next save recomputes target with "maintain", silently undoing the user's choice.
5. Why fix now? Owner observed directly.
Root cause: **domain intent stored only in client state**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given `Goal.mode` field (nullable, default maintain), When migration runs, Then existing rows keep working (NULL treated as maintain).
AC-2: Given user selects "Tăng cân" and saves, When reload, Then "Tăng cân" is selected.
AC-3: Given `PUT /api/goal` with `{ dailyCalories, mode }`, When called, Then both are stored; old clients sending only calories keep mode unchanged.
AC-4: Given `GET /api/goal`, When called, Then response includes `mode`.
AC-5: Given profile load, When goal fetched, Then `goal` state initializes from `mode`.
AC-6: Given 375px, When mode chips render, Then touch >= 44px, no leak.
AC-7: Given build/tests, When run, Then pass.

## 3. Architecture
```mermaid
flowchart LR
  UI[mode chips] --> PUT[PUT /api/goal {calories, mode}]
  PUT --> DB[(Goal.mode)]
  DB --> GET[GET /api/goal]
  GET --> HYDRATE[setGoal(mode)]
```
- `Goal.mode String?` migration; pure helper `normalizeGoalMode` in `src/lib/goal-mode.ts`, TDD tested.
- DB is source of truth; UI state hydrates on load.

### Verification harness & QA matrix
| Area | Type | Command |
|---|---|---|
| Pure helper | unit (TDD) | `npm test -- tests/goal-mode.test.ts` |
| Migration | qc-database | apply + rollback safe; nullable column |
| API | curl | GET/PUT mode roundtrip; legacy PUT without mode keeps prior mode |
| UI | Playwright | select gain -> save -> reload -> gain selected; 375px audit |
| Touch/leak | script | `audit_layout_invariants` at 375/1440 |
| Regression | full | `npm run build && typecheck && lint && test && smoke && verify:ui` |

### Failure modes & resilience
- NULL mode from legacy rows -> helper falls back to maintain (never crashes).
- Unknown mode string -> normalized to maintain on read; DB value left intact (non-destructive).
- API PUT without mode -> Prisma update omits the field, preserving stored mode.

## 4. Contract (REST)
`GET /api/goal` -> `{ goal: { dailyCalories, mode } }` (additive field).
`PUT /api/goal` accepts optional `mode` (backward compatible).

## 5. Data Schema
| Model | Field | Change |
|---|---|---|
| Goal | mode String? | new nullable column, default handled in helper |

## 6. Trade-offs & rejected alternatives
- Rejected: infer mode from calories vs TDEE -> TDEE changes with weight/activity; unreliable.
- Rejected: localStorage -> device-bound, lost on other device; DB is correct.
- Chosen: persisted enum-like string with NULL fallback.

## 7. Takeaways
- User intent is domain data; if it is only in component state, it will be lost on reload.
- Additive API fields keep old clients working during rollout.

## 8. Security
401 gate unchanged; mode validated against allowlist before DB write.

## 9. Performance SLA
Same two queries; no extra request.

## 10. Evidence
- Spec judge: 93/100
- TDD red->green: tests/goal-mode.test.ts (1 test, 5 cases); normalizeGoalMode maps lose/maintain/gain, NULL/unknown -> maintain; tests 70/70 PASS
- Schema: Goal.mode String? migration applied; old rows (NULL) read as maintain via helper
- API additive: GET includes mode; PUT accepts optional mode; legacy PUT with calories only preserves stored mode (verified live: mode stayed "gain")
- Profile page hydrates goal state from GET /api/goal and sends mode on save
- Playwright: select "Tăng cân" -> save -> reload still "Tăng cân" (was reverting to "Duy trì")
- Build/typecheck/lint PASS; smoke 9/9; verify-ui 4/4; URL 200
