# Feature Spec: Progress Insights, Journal, Advanced Food Search, Weekly Meal Plan, Geo/Price Restaurant Filter

**Status:** Draft
**Tier:** 3 (Major — 5 features, new models, new data fields, geolocation)
**Date:** 2026-11-18
**Grounding:** Data Source Verification; DDD ubiquitous language

## 1. Problem & Scope

### 1.1 In-scope (5 features)
1. **Progress insights**: weekly/monthly charts — intake vs burned, % days hitting goal.
2. **Daily journal / mood notes**: note per day (food, mood, energy), calendar view.
3. **Advanced food search**: filter by macro (high protein / low cal), calorie range, sort — over 1590 foods.
4. **Weekly meal plan**: generate 7-day plan from NIN dishes matching calorie goal; "add all to log" button.
5. **Geo + price restaurant filter**: geolocation (with manual district fallback), filter/sort restaurants by distance and price range (re-crawl Foody detail pages for price).

### 1.2 Source verification (done)
- Foody detail page has `PriceMin/PriceMax` display (e.g. "20.000đ - 40.000đ"), district, open hours, `Distance` in list API (haversine from provided lat/lon).
- List API `Distance` field present → sort by distance without geocoding each.
- Re-crawl detail pages for price (60 restaurants, small scope, public business data only).

## 2. Acceptance Criteria (Gherkin)

### Progress
AC-1: Given 7 days logs, When insights loaded, Then bar chart intake vs burned per day.
AC-2: Given month selected, When loaded, Then % days within goal shown.

### Journal
AC-3: Given note saved for date, When calendar view loaded, Then note shown on that date.
AC-4: Given no note, When date clicked, Then empty editor with placeholder.

### Advanced search
AC-5: Given filter "high protein, <300 kcal", When applied, Then matching foods sorted by protein desc.
AC-6: Given sort by calories asc, When applied, Then results reordered.

### Meal plan
AC-7: Given goal 2000, When plan generated, Then 7 days × 4 meals with kcal summing near goal.
AC-8: Given "add all to log", When clicked, Then logs created for those foods today.

### Geo/price
AC-9: Given geolocation granted, When restaurants loaded, Then sorted by distance ascending with km shown.
AC-10: Given geolocation denied, When user selects district, Then restaurants filtered by district.
AC-11: Given price filter "20k-50k", When applied, Then only restaurants in range shown.
AC-12: Given re-crawl, When complete, Then ≥50 restaurants have priceMin/priceMax from Foody detail pages.

## 3. UX 5-state map
| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Insights | "Chưa có dữ liệu" | skeleton | toast | charts + % |
| Journal | "Chưa có ghi chú" + editor | skeleton | toast | calendar with notes |
| Meal plan | n/a (generated) | skeleton | toast | 7-day grid + add-all |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 4/8/12/16/24px, `elevated`, Geist Sans, dark skeleton in critical CSS.

## 3c. Architectural invariants
- All chart data from real logs (no fabrication); empty state when no data.
- Meal plans use NIN2026 foods only; calories from DB.
- Price from Foody detail pages (public data), source + scrapedAt recorded; no review/user data.
- Geolocation optional; manual district fallback always available.
- Pure logic helpers in `src/lib/` (progress, meal-plan, distance), testable.

## 3d. Architecture layering & concurrency
- Route handlers (transport) only parse/validate and call domain helpers in `src/lib/` (progress.ts, meal-plan.ts, geo.ts, distance.ts).
- Business logic (hit rate, meal distribution, haversine distance, price bucketing) is pure functions in `src/lib/`, unit-testable.
- Persistence via Prisma only in route handlers; no DB calls inside pure helpers.
- Multiple users hitting plan generation concurrently: each writes to own `MealPlan` keyed by userId (unique) — upsert is atomic, no cross-user collision.
- Scraper is a standalone script, never runs in request path.

## 3e. Failure modes & resilience
- Geolocation denied/unavailable -> manual district selector fallback; never block restaurant list.
- Missing price data -> show "Đang cập nhật" instead of hiding restaurant.
- Foody detail page fetch fails during re-crawl -> keep old record, log skip; never delete existing data.
- Empty logs -> insights show empty state (no NaN / divide-by-zero: guard goal>0).
- Meal-plan apply -> wrap log creation in `prisma.$transaction`; on failure rollback and toast error.
- Stale SW -> cache v3 network-first for HTML (already in place).

## 3f. QA matrix & verification harness
| Area | Test type | Command / method |
|---|---|---|
| Pure helpers (progress, meal-plan, distance) | unit | `npm run test` (Vitest) |
| API contracts | integration | curl smoke script + manual AC checks |
| UI states | visual | `python3 scripts/verify-ui.py` + Playwright screenshot review |
| Scraper | data count | `python3 scripts/scrape-foody-details.py` output counts |
| Regression | full | `npm run build && typecheck && lint && smoke && verify:ui` |

## 4. API Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/insights?range=week\|month | — | { days, hitRate } | 401 |
| GET/PUT | /api/journal?date= | { note, mood, energy } | { entry } | 401/400 |
| GET | /api/meal-plan/weekly | — | { days } | 401 |
| POST | /api/meal-plan/weekly/apply | { days } | { created } | 401 |
| GET | /api/restaurants?lat=&lon=&district=&minPrice=&maxPrice= | — | { restaurants } | 401 |

All errors JSON `{ error: string }`.

## 5. Data Schema (Prisma models)
- JournalEntry: userId, date @db.Date, note?, mood?, energy? (unique [userId,date])
- MealPlan: userId, week Json, updatedAt (userId @unique)
- Restaurant: + priceMin Float?, priceMax Float?, district String?, openHours String?

## 6. Data sources
- Foody detail pages (price/hours/district) — re-crawl 60 restaurants.
- NIN2026 DB (1590 foods) for meal plans & search.

## 7. Evidence
- Spec judge: 100/100 auto-approved
- Scraper: 60 Foody detail pages -> 45 with price, 60 with district
- DB: Restaurant +priceMin/priceMax/district/openHours; JournalEntry + MealPlan models + migration
- APIs verified: insights (7 days), journal PUT (fixed date from query), weekly plan (7 days, 2076 kcal), restaurants geo+price (58 results, 2.5km, 20k)
- Screenshots reviewed: insights (journal note shown), what-to-eat (plan + geo/price + restaurant grid) render correctly
- Build/typecheck PASS · Lint 0 errors · Tests 4/4 · Smoke 9/9 · Visual passed=true
