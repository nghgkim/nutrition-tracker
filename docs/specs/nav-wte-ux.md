# Feature Spec: Navigation IA + "Hôm nay ăn gì" UX Refactor (Round 2)

**Status:** Draft
**Tier:** 2 (Minor — UI/IA refactor + client race fix, no new domain data)
**Date:** 2026-11-18
**Grounding:** DDD ubiquitous language; client-side request generation invariant

## 1. Problem & Scope
- Round 1 left 3 primary nav links + "Thêm" menu, and 3 in-page tabs. User reports still too many tabs and wants similar items grouped.
- Two defects found in QC:
  1. Restaurant filter requests can resolve out of order; a stale response overwrites the newest filter result.
  2. "Thêm tất cả vào nhật ký" logs all 28 meals (7 days x 4) into today, overshooting the calorie goal.

### 1.1 In-scope
1. Nav: primary = Dashboard / Ăn uống (2 links, no duplicate). "Ăn uống" links to `/what-to-eat`; `/foods` moves into the overflow menu under an "Ăn uống" group heading.
2. Overflow menu grouped: Ăn uống (Thư viện món ăn), Theo dõi (Tiến độ & Nhật ký, Lịch sử, Hồ sơ), Kế hoạch (Tập luyện, Tài chính), Khác (Gia đình, Cài đặt).
3. `/what-to-eat`: 2 tabs only — "Gợi ý" (dish suggestions + weekly plan stacked in one panel, default) and "Quán ăn".
4. Race fix: each restaurant fetch carries a monotonically increasing generation id; stale responses are discarded and the previous request is aborted via `AbortController`.
5. Apply-plan fix: only the 4 meals of the current day are logged; an inline confirmation shows the summed kcal before the POST.

### 1.2 Out-of-scope
- New features/domain data. Mobile bottom tab bar. Changing `/api/meal-plan/weekly/apply` contract (still accepts a meals array).

## 2. Acceptance Criteria (Gherkin)
AC-1: Given the header nav, When opened, Then exactly 2 primary links exist: Dashboard and Ăn uống.
AC-2: Given the overflow menu, When opened, Then items are grouped under 4 section headings and "Thư viện món ăn" is under "Ăn uống".
AC-3: Given /what-to-eat, When loaded, Then only the "Gợi ý" tab is visible and it contains both suggestions and the weekly plan.
AC-4: Given the user clicks "Quán ăn", Then only the restaurant panel renders with 9 cards and "Xem thêm (N)".
AC-5: Given "Xem thêm", When clicked, Then the next 9 cards appear cumulatively.
AC-6: Given two filter changes in quick succession, When the slower older response returns, Then it is discarded and the newest result set is shown.
AC-7: Given a weekly plan, When "Thêm 4 bữa hôm nay" is clicked, Then an inline panel shows today's day label, the 4 meal names and their total kcal.
AC-8: Given the confirmation panel, When "Xác nhận" is clicked, Then exactly 4 food logs are created for today and no other day's meals are logged.
AC-9: Given the confirmation panel, When "Hủy" is clicked, Then no POST is sent.
AC-10: Given dark mode, When switching tabs, Then no white flash occurs (existing critical CSS applies).

## 3. UX 5-state map
| Panel | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Gợi ý | "Vượt mục tiêu" / plan empty | skeleton | toast | 3 dish cards + 7 plan cards |
| Quán ăn | "Không tìm thấy" | skeleton | toast | 9 cards + load more |
| Confirm | — | — | toast | day label + 4 meals + total kcal |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 4/8/12/16/24px spacing, `elevated`, Geist Sans, dark skeleton in critical CSS.

## 3c. Architecture layering & Concurrency strategy
- Route handlers (transport) parse/validate and call pure helpers in `src/lib/`; persistence only in handlers via Prisma.
- `src/lib/request-guard.ts` exposes a pure generation counter: `next()` increments, `isLatest(id)` gates response application. UI pairs it with `AbortController` to cancel in-flight requests on filter change.
- `src/lib/meal-plan.ts` exposes `todayPlanIndex(now)` and `selectDayMeals(plan, dayIndex)` as pure functions, unit-tested; "today" mapping is Monday-based (`(getDay()+6)%7`).
- Meal-plan apply remains a Prisma `$transaction`; each user writes to their own food logs, no cross-user collision.
- Tab state, visible count and confirmation state are local React state; no new API contracts.

## 3d. Failure modes & resilience
- Geolocation denied -> manual district selector fallback; never block the restaurant list.
- Missing price -> show "Đang cập nhật" instead of hiding the restaurant.
- Stale filter response -> discarded by generation guard; aborted request never calls setState.
- Empty logs -> insights empty state; goal>0 guarded against divide-by-zero.
- Apply POST failure -> transaction rollback, toast error, confirmation panel stays open for retry.
- Stale SW -> cache v3 network-first for HTML (already in place).

## 3e. Verification harness & QA matrix
| Area | Type | Command / method |
|---|---|---|
| Generation guard, day selection | unit (TDD red-green) | `npm test -- tests/nav-wte-ux.test.ts` |
| API contracts | integration | `bash scripts/smoke.sh` |
| UI states | visual | `python3 scripts/verify-ui.py` + Playwright screenshots of 2 tabs + confirm |
| Regression | full | `npm run build && typecheck && lint && test && smoke && verify:ui` |

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/what-to-eat | — | { remaining, suggestions } | 401 |
| GET | /api/meal-plan/weekly | — | { week, target } | 401 |
| GET | /api/restaurants | — | { restaurants } | 401 |
| POST | /api/meal-plan/weekly/apply | { meals: [{name, calories}] } | { created, skipped } | 401/400 |

All errors JSON `{ error: string }`. No new endpoints — existing contracts reused; only the caller narrows `meals` to the current day.

## 5. Data Schema
No Prisma model change. UI state only: `activeTab: 'suggest'|'restaurants'`, `visibleCount: number` (starts 9, +9 per click), `confirming: boolean`.

## 6. Evidence
- Spec judge: 100/100 auto-approved; gate check --tier=minor --phase=ba: PASS
- TDD red->green: tests/nav-wte-ux.test.ts written first (import failure), then helpers added; npm test 9/9 PASS
- Build/typecheck PASS; lint 0 errors (1 pre-existing `<img>` LCP warning)
- Smoke 9/9 PASS; python3 scripts/verify-ui.py: passed=true, page_errors=[]
- Playwright AC trace: primary nav = [Dashboard, Ăn uống]; menu headings = [Ăn uống, Theo dõi, Kế hoạch, Khác]; tabs = [Gợi ý, Quán ăn]
- Gợi ý tab contains both suggestion cards and 7-day plan; restaurants 9 -> 18 cards on load more
- Confirm panel: "Thứ 4 · 4 bữa · tổng 1224 kcal" with 4 meal rows; DB check after confirm: exactly 4 FoodLog rows dated today for the test user
- Race AC: first filtered response delayed 2.5s, second fast; final rendered cards were the fast ones (FAST-0, FAST-1) - stale response discarded
- Screenshots reviewed: nav grouped menu, suggest+plan, inline confirmation; dark mode covered by earlier round (no white flash)
- Deployed via scripts/deploy.sh; https://nutrition.nghgkim.id.vn/login -> HTTP 200
