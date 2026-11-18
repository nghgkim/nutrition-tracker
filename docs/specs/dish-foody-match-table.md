# Feature Spec: Foody Restaurant Match for Dish Suggestions + Table View

**Status:** Draft
**Tier:** 2 (Minor — pure matching helper, one DB column, UI table refactor)
**Date:** 2026-11-18
**Grounding:** DDD ubiquitous language; deterministic keyword matching for real data

## 1. Problem & Scope
- Dish suggestions use NIN2026 (real calories). Foody data has no nutrition facts, so it cannot supply calories without fabrication.
- User wants Foody restaurants attached to each suggested dish as practical context ("where to eat this"), and wants the restaurant list as a table instead of a card grid.

### 1.1 In-scope
1. Crawl `Cuisines` from Foody detail pages into `Restaurant.cuisines` (JSON string of Vietnamese names), via a standalone script; source + `scrapedAt` already recorded.
2. Pure helper `matchRestaurantsForDish(dishName, restaurants, limit)` in `src/lib/dish-match.ts`:
   - normalize Vietnamese accents to ASCII lowercase;
   - keyword list from dish name: `com, bun, pho, banh, chao, lau, mi, hu tieu, xoi, ga, vit, cuon, huynh, bo, nuong, chien, kho, sup, dumsum, dimsum, che, thit, ca`;
   - leading bigram (first two tokens of the dish name) is a strong signal: +10 when it appears in the restaurant name;
   - keyword score = keyword length when present in the restaurant name, +1 when present in cuisines;
   - rank by total score desc, then rating desc; return top `limit` (default 1) with score >= 2; never fabricate a match.
3. Dish suggestion cards show an inline row: `Quán Foody: <name>` (link) when a match exists; otherwise no row (no fake suggestion).
4. Restaurant tab: replace card grid with a `<table>` (columns: Tên quán | Quận / Địa chỉ | Giá | Rating | Khoảng cách | Link) inside `overflow-x-auto`; keep 9-per-page "Xem thêm" pagination and all filters. On narrow screens the first column is sticky so the restaurant name stays visible during horizontal scroll.
5. Price filter semantics are strict and explicit: `maxPrice` keeps only restaurants whose `priceMax <= maxPrice`; `minPrice` keeps only those whose `priceMin >= minPrice`; records without a price never satisfy an explicit bound.

### 1.2 Out-of-scope
- Changing calorie source (stays NIN2026). Menu-item level dish data from Foody (unavailable). Mobile card view (table scrolls horizontally).

## 2. Acceptance Criteria (Gherkin)
AC-1: Given the Foody scrape script, When run, Then ≥50 of 60 restaurants have non-empty `cuisines`.
AC-2: Given dish "Cơm gà" and a restaurant named "Cơm Gà Hải Nam", When matched, Then that restaurant is returned with score >= 3.
AC-3: Given dish "Bún bò Huế" and restaurant "Bún Thịt Nướng Kiều Bảo" (cuisine "Món Việt"), When matched, Then the bún restaurant wins over an unrelated high-rated one.
AC-4: Given a dish with no matching keyword, When matched, Then an empty array is returned.
AC-5: Given suggestions loaded, When a dish has a match, Then its card shows a Foody link with the restaurant name.
AC-6: Given suggestions loaded, When a dish has no match, Then no Foody row is rendered on that card.
AC-7: Given the Quán ăn tab, When opened, Then a table with 6 headers renders with exactly 9 rows.
AC-8: Given "Xem thêm", When clicked, Then the table has 18 rows and the button count decreases.
AC-9: Given price filter "≤ 50k", When applied, Then table rows only include restaurants whose priceMax <= 50000.
AC-11: Given two candidate restaurants, When one matches the dish's leading bigram and the other matches only one generic keyword, Then the bigram match ranks first even with a lower rating.
AC-12: Given a 390px viewport, When the table is scrolled horizontally, Then the "Tên quán" column stays visible (sticky) and the load-more button remains reachable.
AC-10: Given empty filter result, When rendered, Then an empty-state row spans all columns.

## 3. UX 5-state map
| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Dish cards | "Vượt mục tiêu" | skeleton | toast | cards with optional Foody row |
| Restaurant table | empty-state row | skeleton | toast | 9 rows + load more |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 4/8/12/16/24px spacing, `elevated`, Geist Sans, dark skeleton in critical CSS.

## 3c. Architecture layering & Concurrency strategy
- Route handlers only parse/validate; persistence via Prisma in handlers. Pure matching logic lives in `src/lib/dish-match.ts`, unit-tested with no DB dependencies.
- The scraper is standalone (never in the request path); it upserts by `externalId`, so concurrent/duplicate runs are idempotent.
- Matching reads an in-memory restaurant snapshot already fetched by the page; no extra round trip per dish. Filters remain race-guarded by the generation counter from the previous spec.

## 3d. Failure modes & resilience
- Foody detail fetch fails during cuisine scrape -> keep the existing row, log skip; never delete data.
- Cuisines missing -> name-only matching still works; no match -> no Foody row, never a fabricated placeholder.
- Accent variants / mixed case -> normalized before matching.
- Filter yields zero rows -> single empty-state row; "Xem thêm" hidden when no remaining rows.
- Stale filter response -> discarded by generation guard (previous invariant retained).
- Price with unknown value -> excluded only when an explicit price bound is active; still shown in the unfiltered table.
- No bigram match -> fall back to keyword score; if no keyword matches, no Foody row is rendered.

## 3e. Verification harness & QA matrix
| Area | Type | Command / method |
|---|---|---|
| Matching helper | unit (TDD red-green) | `npm test -- tests/dish-match.test.ts` |
| Price filter semantics | unit (TDD red-green) | `npm test -- tests/restaurant-filter.test.ts` |
| Cuisine scrape | data count | `python3 scripts/scrape-foody-cuisines.py` -> >=50/60 |
| UI states | visual | `python3 scripts/verify-ui.py` + Playwright screenshot of table + dish card |
| Regression | full | `npm run build && typecheck && lint && test && smoke && verify:ui` |

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/what-to-eat | — | { remaining, suggestions } | 401 |
| GET | /api/restaurants | lat, lon, district, minPrice, maxPrice | { restaurants } incl. `cuisines` | 401 |

All errors JSON `{ error: string }`. No new endpoints.

## 5. Data Schema
- `Restaurant.cuisines String?` — JSON array of Vietnamese cuisine names from Foody detail pages; nullable, no new index needed (not queried in DB).
- No other model change.

## 6. Evidence
- Spec judge: 100/100 auto-approved
- Cuisine scrape: 53/60 restaurants have Foody `Cuisines`; stored as JSON text in `Restaurant.cuisines`, migration applied in DB container
- TDD red->green: tests/dish-match.test.ts (5 tests) + tests/restaurant-filter.test.ts (4 tests) written before helpers; npm test 18/18 PASS
- QC defect found and fixed: price filter kept restaurants with no price ("Đang cập nhật"). Extracted pure `filterByPrice` helper (price-range overlap semantics); API now uses it; re-check: 0 unknown-price rows for <=50k
- Build/typecheck PASS; lint 0 errors/warnings; smoke 9/9 PASS; verify-ui passed=true, page_errors=[]
- Playwright AC trace: 3 dish cards all show a real Foody restaurant link; table headers = [Tên quán, Quận / Địa chỉ, Giá, Rating, Khoảng cách, Link], 9 -> 18 rows on load more
- Empty state verified with an empty API response: 1 row with colspan=6 and "Không tìm thấy quán phù hợp bộ lọc.", load-more hidden
- Screenshots reviewed: dish suggestions with Foody rows, restaurant table with 9 rows + pagination
- Round 2 hardening (same spec, re-judged 100/100): dish leading-bigram boost (+10) outranks generic keyword matches; strict price semantics (`priceMax <= max`, `priceMin >= min`); sticky first column on narrow screens
- TDD red->green for round 2: bigram scenario failed on old code (generic higher-rated restaurant won), strict-price scenarios failed on overlap code; after fix npm test 19/19 PASS
- Browser re-check: price <=50k returns 0 unknown-price rows and every row's priceMax <= 50k; at 390px viewport the first column x stayed at container edge after scrollLeft=400 (sticky PASS)
- Screenshots reviewed: desktop suggestions with Foody rows, mobile table with sticky first column
- Deployed via scripts/deploy.sh; https://nutrition.nghgkim.id.vn/login -> HTTP 200
