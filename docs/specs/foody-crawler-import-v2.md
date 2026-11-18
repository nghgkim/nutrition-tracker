# Feature Spec: Import Curated Foody Crawler Restaurants (Round 2)

**Status:** Draft
**Tier:** 2 (Minor — data import script + pure mapping helpers, no schema change)
**Date:** 2026-11-18
**Grounding:** Source provenance; DDD ubiquitous language (restaurant vs dish data)

## 1. Problem & Scope
- The app has 60 Foody restaurants. A separate crawler repo (`~/Code/Personal/food-data-crawler`) produced `data/foody-hcm-500.json`: 15,857 unique HCMC records, still being written at import time.
- More restaurants improve `matchRestaurantsForDish` coverage. The dataset must be curated: many records are low quality (template address `{{Model.Restaurant.Address}}`, no coords, no website).
- Source compliance note: "public Foody pages via undocumented endpoints ... for research use only ... keep volume low." Import is therefore capped and attributed; no menu items are imported (crawler confirms `menu_items` is always empty — no dish data to fabricate from).

### 1.1 In-scope
1. Pure helpers in `src/lib/crawler-import.ts`:
   - `isQualityVenue(item)` — non-template address, lat/lng present, website present, rating > 0;
   - `mapCrawlerVenue(item)` — map to a Prisma `Restaurant` create input, with `source = "Foody-crawler"` and `scrapedAt = item.fetched_at`;
   - `selectCuratedVenues(items, limit = 500)` — filter quality, dedupe by `source_id`, sort by `review_count` desc then rating desc, take `limit`.
2. Standalone script `prisma/import-crawler-restaurants.ts`: read a **stable snapshot** of the crawler JSON (path from env), map, then `createMany({ skipDuplicates: true })` so the existing 60 curated rows (with real price/cuisines/hours) are never overwritten.
3. Imported rows have `priceMin/priceMax/district/cuisines/openHours = null`; UI already shows "Đang cập nhật" and strict price filters naturally exclude unknowns.
4. Re-running the script is idempotent; later crawler output can be imported by pointing at a new snapshot.

### 1.2 Out-of-scope
- Menu/dish data and calories (crawler exposes none; NIN2026 remains the only calorie source).
- Re-crawling Foody from this app. Changing the restaurant table/UI.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given a venue with address `{{Model.Restaurant.Address}}`, When filtered, Then it is rejected.
AC-2: Given a venue with no lat/lng or no website, When filtered, Then it is rejected.
AC-3: Given duplicate `source_id` entries, When curated, Then only the first survives.
AC-4: Given the crawler file, When curated with limit 500, Then at most 500 venues are produced, sorted by review count desc.
AC-5: Given an existing restaurant id, When the script runs, Then its price/cuisines/hours are unchanged.
AC-6: Given the script is run twice, When compare counts, Then the second run adds zero rows (idempotent).
AC-7: Given imported venues, When the API is called, Then `GET /api/restaurants` returns > 400 restaurants with `source: "Foody-crawler"` preserved on each record.
AC-8: Given the expanded list, When a dish suggestion is rendered, Then Foody match coverage is greater than with 60 restaurants only.
AC-9: Given strict price filter "≤ 50k", When applied, Then no "Đang cập nhật" row appears (unknown prices never satisfy an explicit bound).

## 3. UX 5-state map
No new screens. Restaurant table: empty state / loading / error / success states unchanged; only row count grows.

## 3b. Design tokens
Unchanged (Emerald primary, Nordic light/dark, `elevated`, Geist Sans).

## 3c. Architecture layering & Concurrency strategy
- Pure mapping/filter helpers in `src/lib/` are unit-tested with no I/O; the script owns all file reading and Prisma writes.
- The crawler writes the JSON file concurrently; import reads a copied **stable snapshot**, never the live file. This avoids a partial-parse race.
- `createMany({ skipDuplicates: true })` is atomic per batch on `externalId`'s unique index — concurrent or repeated runs cannot create duplicates or clobber curated rows.
- Import is a standalone script, never in the request path; no new endpoints.

## 3d. Failure modes & resilience
- Snapshot JSON parse fails -> script aborts with a clear error; DB unchanged.
- Upstream venue missing coordinates/website -> filtered out, no fabricated values.
- Existing restaurant id -> skipped by unique constraint; curated price/cuisines/hours preserved.
- Unknown price -> "Đang cập nhật" in UI; strict price filters exclude it rather than guessing.
- Compliance -> capped at 500 records, attributed as `Foody-crawler`, no personal/review text copied.

## 3e. Verification harness & QA matrix
| Area | Type | Command / method |
|---|---|---|
| Pure mapping helpers | unit (TDD red-green) | `npm test -- tests/crawler-import.test.ts` |
| Import idempotency | integration | run script twice, compare DB counts |
| Data quality | SQL audit | count null address / template address after import |
| API + UI | visual | `GET /api/restaurants` count + Playwright table screenshot |
| Regression | full | `npm run build && typecheck && lint && test && smoke && verify:ui` |

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/restaurants | — | { restaurants, source: "Foody" } | 401 |

No new endpoints. Existing contract unchanged; each record carries its own `source`.

## 5. Data Schema
No Prisma model change. Reuses `Restaurant` fields. New rows set `source = "Foody-crawler"`, `scrapedAt = fetched_at`, and leave enrichment fields null.

## 6. Evidence
- Spec judge: 100/100 auto-approved; gate check --tier=minor --phase=ba: PASS
- TDD red->green: tests/crawler-import.test.ts (6 tests) written before helpers; npm test 24/24 PASS
- Snapshot taken from the crawler's live file at 17,135 items (file mtime was seconds old); import reads only the snapshot, never the live file
- Curated import: 483 of 500 rows inserted; 17 duplicates skipped by unique externalId; second run imported 0 rows (idempotent AC-6)
- DB audit: 543 total = 60 curated + 483 Foody-crawler; 45 curated rows still carry real prices; 0 template addresses and 0 missing coordinates
- API audit: GET /api/restaurants -> 543 rows in 314 KB / 7 ms; price<=50k -> 18 rows, 0 unknown-price rows
- Match quality measured over 28 weekly-plan dishes: average best score 3.93 (60 rows) -> 7.54 (543 rows); 12/28 dishes improved
- Browser check: table counter "Hiển thị 9 / 543 quán", new Foody rows visible (Sukiya, Bánh Bèo Huế), page_errors=[]
- Build/typecheck/lint PASS; smoke 9/9 PASS; verify-ui passed=true
- Deployed via scripts/deploy.sh; https://nutrition.nghgkim.id.vn/login -> HTTP 200
- Compliance: capped at 500 records, attributed source=Foody-crawler, no menu/review text copied (crawler menu_items is always empty)
