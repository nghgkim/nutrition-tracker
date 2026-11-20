# Project Summary — thuypn by kimnh

> Handover document. All figures verified from the repository and live database on 2026-11-19.

## 1. What it does

A full-stack Vietnamese-language nutrition tracker. Users log foods, see calories and macros against a personal goal, track weight/BMR/TDEE, manage budgets, share selected data with family, and browse real Foody venues filtered by district, price, rating and distance.

**Canonical URL:** `https://nutrition.nghgkim.id.vn` (Cloudflare named tunnel).
**Homepage:** `/` renders the dashboard directly; `/dashboard` is a legacy redirect to `/`.

## 2. Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.4.6 (App Router), React 19.3.0 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4.3.5 |
| ORM / DB | Prisma 7.10.1 + `@prisma/adapter-pg`, PostgreSQL 16 |
| Auth | JWT signed with `jose`, httpOnly cookie `nt_session`, middleware route protection |
| Tests | Vitest 4.1.12 (unit), Playwright (visual gate), custom smoke shell script |
| Deploy | Docker Compose (db + app + reminder scheduler + named tunnel) |

Local commands: `npm run dev`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `bash scripts/smoke.sh`, `npm run verify:ui`, `bash scripts/deploy.sh`.

> **Runtime note:** use `/usr/bin/node` (v20.20.2). The nvm default can fall back to v14, which cannot parse Vitest.

## 3. Repository shape

- `src/app/` — 12 pages + 44 REST route handlers
- `src/components/` — reusable UI (nav, theme provider, charts, forms)
- `src/lib/` — pure domain logic (progress, geo, pagination, filters, sort, badge, request guard, normalization)
- `prisma/` — schema, migrations, seed/import scripts
- `scripts/` — scrapers, `smoke.sh`, `verify-ui.py`, `ui-checks/check_layout.py`
- `docs/specs/` — 37+ feature specs, each judged by `gate judge` (≥ 90/100)
- `docs/evidence/` — Playwright screenshots/reports per feature

## 4. Data sources (no fabricated nutrition data)

| Dataset | Count | Source | Used for |
|---|---|---|---|
| Foods | 1,590 | NIN 2026 (Thông tư 30/2026/TT-BYT) | Calories, macros, weekly plan |
| Restaurants | 23,793 | Foody public pages, scraped 2026-11-18/19 | Names, prices, district, ratings, coordinates |
| Users | 6 (test accounts) | local | Auth/log fixtures |

Restaurant enrichment:
- 60 curated venues with real price/cuisines/opening hours from detail pages.
- 23,733 crawler venues from `food-data-crawler` (`data/foody-hcm-500.json`, 33,285 items at last check), imported through a stable snapshot + batched idempotent `createMany`.
- 437 venues currently carry `priceMin/priceMax`; the rest honestly show "Đang cập nhật".
- **No menu/dish calories from Foody** — the crawler exposes no dish data. NIN2026 is the only calorie source.

## 5. Feature map

| Area | Pages / endpoints |
|---|---|
| Auth | register, login, logout, `/api/auth/me`, JWT middleware |
| Daily logging | `/` dashboard, `/api/logs`, food search with accent-insensitive matching |
| Nutrition | BMR/TDEE, Asian BMI (QĐ 2892/QĐ-BYT), NIN recommended calories — `/api/nutrition/*` |
| Weights & goals | `/api/weight`, `/api/goal` |
| Progress | `/insights`, `/api/insights` (intake vs burned, hit rate) |
| Journal | `/api/journal` per-date notes/mood/energy |
| Exercise | `/exercise`, `/api/exercise`, `/api/training-plan`, `/api/training/suggestions` |
| Finance | `/finance`, personal + household budgets, expenses, alerts |
| Family | `/family`, invites, roles, activity feed, Web Push (VAPID) |
| Venues | `/what-to-eat`, `/api/restaurants` — multi-criteria filters, stable paging, global haversine distance sort |
| Settings | `/settings`, `/profile`, i18n (vi/en), dark mode |

### Deliberate removals (with rationale)
- Random NIN dish suggestion cards — calorie-only matching produced unrealistic dishes.
- Weekly meal-plan tab, its API endpoints and `MealPlan` table — users perceived it as the same auto-advice.
- Rebrand to "thuypn by kimnh" — reverted at owner request; the cropped mark read as a cut-off image.
- Open-now / delivery filters — source data has zero `opening_hours` values and no delivery field; a filter would be fabricated.

## 6. Engineering conventions (ratified)

- **Spec-before-code:** every Tier-2/3 change gets `docs/specs/<feature>.md` judged ≥ 90/100 by `gate judge`; pre-commit hook enforces it.
- **TDD:** pure helpers written as failing tests first, then implemented (e.g. `request-guard`, `pagination`, `distance-sort`, `price-range`, `clampCriteria`, `normalizeDistricts`, `filter-badge`, `nav-active`).
- **Principle VII (Anti-Blackbox):** specs carry Five Whys, Mermaid data-flow, rejected alternatives, takeaways.
- **Principle VIII (Mobile-First):** 375/390px audit enforces zero horizontal leak and ≥ 44px touch targets; tables become stacked cards on mobile.
- **Principle IX (Zero-Trust):** auth gate before every DB access, allowlisted sort values, parameterized Prisma/`$queryRaw` only, no secret fallback.
- **Zero suppression:** no `eslint-disable`, `@ts-ignore`, `# noqa`; lint warnings are fixed or justified, not silenced.
- **Stable paging:** every `orderBy` ends with a unique `id` tie-breaker; filters run in SQL before `LIMIT/OFFSET`.

## 7. QC gates (all passing on last run)

| Gate | Result |
|---|---|
| `npm test` | 9 files, 41 tests passed |
| `npm run typecheck` | clean |
| `npm run lint` | 0 errors |
| `npm run build` | success |
| `bash scripts/smoke.sh` | 9/9 checks |
| `python3 scripts/verify-ui.py` | 4/4 viewports (375, 390, 768, 1440), `page_errors: []` |
| Mobile layout audit | 6/6 pages pass, zero touch violations |
| Deployment | `/` 200 authenticated, `/dashboard` 307 → `/` |

## 8. Operations

```bash
# Deploy (rebuild image, recreate containers, verify URL)
bash scripts/deploy.sh

# Database access (port not exposed on host)
docker exec nutrition-tracker-db-1 psql -U nutrition_tracker -d nutrition_tracker

# Re-import crawler data (idempotent)
cp ~/Code/Personal/food-data-crawler/data/foody-hcm-500.json /tmp/foody-hcm-full.json
docker run --rm --network container:nutrition-tracker-db-1 \
  -v "$PWD:/app" -v "$PWD/node_modules:/app/node_modules_ro" \
  -v /tmp/foody-hcm-full.json:/tmp/foody-hcm-full.json -w /app \
  -e DATABASE_URL="postgresql://nutrition_tracker:nutrition_tracker_dev_pw@127.0.0.1:5432/nutrition_tracker" \
  -e CRAWLER_SNAPSHOT=/tmp/foody-hcm-full.json node:20-slim \
  sh -c "cp -r /app/node_modules_ro /app/node_modules; /app/node_modules/.bin/tsx prisma/import-crawler-restaurants.ts"
```

Secrets (`.env`, gitignored): `DATABASE_URL`, `JWT_SECRET`, Cloudflare tunnel token, VAPID keys.

## 9. Known limitations / next candidates

- Only 437/23,793 venues have prices; price filtering therefore matches a small subset.
- `opening_hours` exists for just the 60 curated venues; no open-now filter.
- Distance sort uses a SQL haversine expression without PostGIS — fine at 23k rows, revisit at ~100k.
- NIN2026 calories may be per 100 g for some dishes; the weekly plan displays `servingSize` to reduce ambiguity.
- Service-worker cache name is still `nutritrack-v3`; bump it if a stale PWA bundle is observed.

## 10. History

~90 commits, each following spec → TDD implementation → QC evidence → deploy. Full trail in `git log --oneline`, `docs/specs/`, and `docs/evidence/`.
