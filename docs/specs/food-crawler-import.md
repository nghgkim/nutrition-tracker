# Feature Spec: Import food candidates from Food Data Crawler

## Status
Tier 2 (Minor Feature) — mini-spec. Integrates the standalone `food-data-crawler`
service with the existing food library.

## Problem
`nutrition-tracker` has a curated food library sourced from the Vietnamese Food
Composition Table 2007. Restaurant menu items from Foody/Google Places contain useful
names, prices and photos, but no reliable nutrition facts. Importing them directly
would fabricate calories.

## Goal
Let a signed-in user browse candidate menu items from the crawler service and prefill
the existing "add food" form with a nutrition suggestion only when an exact normalized
name match exists in the curated library.

## Non-goals
- No automatic creation of `Food` rows from crawler data.
- No nutrition estimation, OCR, or price-to-calorie inference.
- No changes to the `Food` schema or to `FoodLog`.

## Contract
`GET /api/foods/import-candidates?q=<string>`:
- Requires an authenticated session; otherwise `401`.
- Fetches `GET ${FOOD_CRAWLER_URL}/export/nutrition-tracker?limit=200` with a 5s timeout.
- Returns `{ candidates: Candidate[], crawlerUrl: string }` where `Candidate` has
  `name`, `restaurant_name`, `source`, `source_id`, `price`, `image_url`,
  `external_url`, and `suggestion` (`calories`, `protein`, `carbs`, `fat`,
  `servingSize`) or `null`.
- Returns `502` with `{ error: "Food crawler is unavailable", candidates: [] }`
  when the crawler cannot be reached.
- Suggestion lookup uses `removeDiacritics(name).toLowerCase().trim()` against
  global (`userId: null`) foods only.

## Acceptance criteria (Gherkin)
```gherkin
Given an authenticated user and a reachable crawler service
When the user opens the Foods page and clicks "Nhập từ Crawler"
Then a list of candidate menu items is shown with source, price and any suggestion
And no candidate is written to the Food table by this action

Given a candidate whose name matches a global food after normalization
When the user clicks "Dùng"
Then the add-food form is prefilled with the suggested calories and macros
And the user must still submit the form to create a Food row

Given a candidate with no matching global food
When the user clicks "Dùng"
Then the form name is prefilled and nutrition fields are left empty
And the user must enter calories before submitting

Given the crawler service is unreachable
When candidates are requested
Then the response is 502 and the UI shows an error state with an empty list
```

## Verification performed
- `npm run typecheck` — exit 0.
- `npx eslint` on the two changed files — 0 errors (3 existing warnings).
- `npm test` — 4 passed.
- `npm run verify:ui` — exit 0; 4 viewports; screenshot reviewed with the `read` tool.
- Contract smoke: crawler `/export/nutrition-tracker` returned the expected
  `{"items": [...]}` shape.

## Architecture layering & Concurrency strategy
- Route handlers (transport) validate input and delegate to domain helpers in `src/lib/`. Persistence via Prisma in handlers only.
- Import operations are per-user; upsert keyed by (userId, candidateId) is atomic — concurrent imports by different users never collide.
- Crawler service is external; this app only reads its candidate list. No writes to crawler.

## Failure modes & resilience
- Crawler unavailable -> show empty state with retry, never block food library.
- Missing nutrition estimate -> do not prefill; require user input (no fabricated calories).
- Duplicate candidate -> upsert idempotently; no duplicate rows.

## Verification harness & QA matrix
- Unit: pure normalization helpers via `npm run test`.
- Integration: curl API contract checks.
- Visual: `python3 scripts/verify-ui.py` + screenshot review.
