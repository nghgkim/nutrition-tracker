# Feature Spec: Weekly Meal Plan Must Hit Calorie Target (Tier 2)

**Status:** Draft
**Tier:** 2 (Minor — pure planner logic + self-heal of stored plans)
**Date:** 2026-11-19
**Grounding:** Principle VII (Five Whys, Mermaid, trade-offs); DDD ubiquitous language

## 1. Problem & Context (Five Whys)
Live data: target 2000 kcal, day totals `[2076, 1919, 1224, 1509, 1962, 1348, 1766]` — up to 776 kcal off.

1. Why are totals off target? `buildWeeklyPlan` picks foods by rotating index (`(i*4+j) % pool.length`), not by remaining budget.
2. Why was that chosen? Simple deterministic spread from a 600-food sample.
3. Why is it wrong? Meal planning is a bounded selection problem: 4 items must sum near the daily target.
4. Why wasn't it caught? Tests only checked day count/meal count, never calorie deviation.
5. Why does it matter? The whole point of the plan is matching the user's goal; a 1200 kcal day silently breaks the diet.
Root cause: **no optimization objective in the planner**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given target 2000 and a realistic food pool, When a week is built, Then every day total is within ±10% of 2000.
AC-2: Given 4 meals per day, When selected, Then no food repeats within the same day.
AC-3: Given 7 days, When built, Then days are not identical (rotation/variety preserved).
AC-4: Given a stored plan whose totals deviate >10% from the current goal, When the plan API is read, Then it is regenerated and persisted (self-heal after goal changes).
AC-5: Given the "Thêm 4 bữa hôm nay" action, When applied, Then only today's 4 meals are logged (unchanged).
AC-6: Given 375px, When the plan grid renders, Then no touch/leak regression.

## 3. UX 5-state map
| State | Plan grid |
|---|---|
| Empty | n/a (generated) |
| Loading | skeleton |
| Error | toast, keep previous |
| Success | 7 day cards, each showing total near target |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 44px touch base, Geist Sans.

## 3c. Architecture & mental model
```mermaid
flowchart LR
  GOAL[user goal] --> API[GET /api/meal-plan/weekly]
  FOODS[(NIN2026 foods)] --> PLAN[buildWeeklyPlan]
  PLAN --> OPT[per-day greedy: minimize |sum - target|]
  OPT --> CHECK{stored deviates >10%?}
  CHECK -->|yes| UPSERT[(Prisma upsert new week)]
  CHECK -->|no| SERVE[return stored]
```
- Pure planner in `src/lib/meal-plan.ts`, unit-tested TDD; Prisma only in the route.
- Deterministic: rotation by day index, no `Math.random()` in production planning.

## 3d. Failure modes & resilience
- Food pool too small -> best-effort selection; never throw.
- Goal changes -> stored plan self-heals on next read.
- Unauthenticated -> 401 before any DB work.
- Apply action still transactional via `$transaction`.

## 3e. QA matrix & harness
| Area | Type | Command |
|---|---|---|
| Planner | unit (TDD) | `npm test -- tests/meal-plan.test.ts` |
| API totals | curl | day totals within ±10% of target |
| UI | Playwright | 375/1440 screenshot + audit |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/meal-plan/weekly | — | { week, target } | 401 |
| PUT | /api/meal-plan/weekly/apply | { meals } | { created, skipped } | 401/400 |

No new endpoint. Self-heal writes on GET are idempotent and per-user.

## 5. Data Schema
No migration. Reuses `MealPlan.week` JSON.

## 6. Trade-offs & rejected alternatives
- Rejected: exhaustive combinations of 600 choose 4 -> 2B combinations per day; infeasible.
- Rejected: scale calories mathematically to hit target -> would fabricate calories not in NIN.
- Rejected: pick closest single food ×4 -> duplicates and poor variety.
- Chosen: greedy per-slot selection minimizing remaining-budget gap with a per-day rotation, then validate deviation in tests.

## 7. Key engineering takeaways
- A planner needs an explicit objective function; "spread across pool" is not planning.
- Invariants should be asserted in tests (calorie deviation), not just structural counts.
- Cached user state must be invalidated when its input (goal) changes — self-heal on read is pragmatic for a single-user JSON blob.

## 8. Evidence
- Spec judge: 100/100
- TDD red->green: tests/meal-plan.test.ts written first — old planner deviated 270/250 kcal from target; new greedy planner minimizes remaining-budget gap per slot, adds deterministic per-day noise for variety, no duplicates; tests 39/39 PASS
- API self-heal: stored plan is regenerated + upserted when any day deviates >10% from the current goal, so changing goal updates the plan
- Live verification: goal 2000 -> totals [2000,1999,2001,2000,1998,1997,2006] (max dev 6); goal 1600 -> [1598..1601] (max dev 2)
- Playwright 375/1440: UI shows 1598/1599 kcal per day matching 1600 goal, audit passed; apply-today action unchanged
- Build/typecheck/lint PASS; smoke 9/9; verify-ui 4/4 viewports PASS; URL HTTP 200
