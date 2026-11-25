# Feature Spec: Multi-Source Internet Food Search with Provenance (Tier 3)

**Status:** Draft
**Tier:** 3 (Major — new external integration, multi-source, schema provenance)
**Date:** 2026-11-25
**Grounding:** `dev-resilient-integration` skill; Release It! Ch.4-5; OWASP zero-trust

**KB citations (retrieved this session):**
- Release It! — Stability Patterns > Timeouts > Remember This — p.106–107: "Apply Timeouts to Integration Points, Blocked Threads, and Slow Responses... avert Cascading Failures."
- Release It! — Stability Patterns > Circuit Breaker > Remember This — p.110: "Don't do it if it hurts... Use together with Timeouts."
- Context7 USDA FDC docs: `search(query, page_size, page_number, data_type)` — Foundation / SR Legacy / Branded data types.

## 1. Problem & Context
Owner wants internet search by dish name to auto-fill calories/macros in the add-food form, from **multiple sources** — not just local NIN2026. Each result must show source + per-100g basis, be editable before save, and record `Food.source`.

### Five Whys
1. Why internet? Local NIN2026 (1,590 items) misses many dishes users eat.
2. Why not LLM guess? Fabricated nutrition violates project invariant.
3. Which sources? NIN2026 (local, trusted) + Open Food Facts (free, global, per-100g, verified live) + USDA FDC (optional, requires key).
4. Why risk? External APIs can hang/fail — must use timeouts + circuit breaker (Release It!).
5. Why Tier 3? New integration points, new response normalization, provenance field, retry/timeout strategy.
Root cause: **no trusted path from a typed name to real internet nutrition data with traceable source**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given add-food dialog, When user types ≥2 chars, Then results from NIN2026 (local) + Open Food Facts (internet) appear in one grouped list, each with source badge and "per 100g" basis.
AC-2: Given a result, When clicked, Then form fields are autofilled BUT remain editable before save.
AC-3: Given save, When POST /api/foods runs, Then `source` records the exact origin (e.g. `NIN2026`, `Open Food Facts`, `USDA-FDC`) — no fabricated value.
AC-4: Given Open Food Facts timeout/failure, When circuit trips, Then local NIN2026 results still render and internet section shows a clear "tạm thời không khả dụng" message (no cascade).
AC-5: Given duplicate query requests, When typing fast, Then only latest query applies (request-key guard) and old fetches aborted.
AC-6: Given API key absent for USDA, When results render, Then USDA section is simply omitted (no error).
AC-7: Given 390px, When results render, Then touch >= 44px, no horizontal leak, dark mode clean.
AC-8: Given unauthenticated call, When search endpoint hit, Then 401 via problemResponse.
AC-9: Given build/tests, When run, Then pass.

## 3. UX 5-state map
| State | Internet results |
|---|---|
| Empty | "Không tìm thấy" + manual entry still available |
| Loading | small inline skeleton rows |
| Error | "Nguồn internet tạm thời không khả dụng" — local results kept |
| Success | grouped results with source badges |
| Partial | NIN2026 results shown while OFF pending |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 44px touch base, source badges via muted/border.

## 3c. Architecture & mental model
```mermaid
flowchart LR
  UI[name input debounce 250ms] --> API[GET /api/foods/search-all?q=]
  API --> LOCAL[(NIN2026 local DB)]
  API --> OFF[Open Food Facts: timeout 5s + circuit breaker]
  API --> USDA[USDA FDC: only if FOOD_FDC_API_KEY]
  LOCAL --> NORM[normalize to per-100g result]
  OFF --> NORM
  USDA --> NORM
  NORM --> UI[grouped results + source]
  UI --> FORM[autofill editable]
  FORM --> POST[/api/foods with source]
```
- Pure helper `normalizeInternetFoods` in `src/lib/food-search-all.ts`, TDD tested (dedupe, per-100g conversion, missing nutrient -> null not 0).
- Resilient client: `AbortSignal.timeout(5000)`, module-level circuit breaker (5 failures -> open 30s), no retries on 4xx (Release It! p.106–110).
- OFF fields: `product_name`, `brands`, `nutriments.energy-kcal_100g`, `protein_100g`, `carbohydrates_100g`, `fat_100g`.
- USDA optional via `FOOD_FDC_API_KEY`; if absent, skip silently.

### Verification harness
| Area | Type | Command |
|---|---|---|
| Pure helper | unit (TDD) | `npm test -- tests/food-search-all.test.ts` |
| Integration lint | script | `lint_integration_resilience.py` on new route (0 MISSING_TIMEOUT) |
| API | curl | search-all?q=com -> grouped results w/ sources; unauth 401 |
| UI | Playwright | type -> grouped list -> autofill -> editable -> save with source |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

### Failure modes
- OFF unreachable -> circuit opens, local results still shown, error hint.
- Missing nutrient -> `null` displayed as "—", never 0 fabricated.
- Timeout -> abort after 5s; no cascade to local lookup.

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/foods/search-all?q= | — | { groups: [{ source, items: [{name, calories, protein, carbs, fat, servingSize, source}] }], degraded?: string } | 401 |

New endpoint only. Existing `/api/foods/suggest` remains for fast local-only lookup.

## 5. Data Schema
| Model | Field | Change |
|---|---|---|
| Food | source | existing field; now records exact internet source string |

## 6. Trade-offs & rejected alternatives
- Rejected: LLM name->nutrition -> fabricated data.
- Rejected: rely solely on OFF -> missing Vietnamese dishes; local NIN2026 first is safer.
- Rejected: no circuit breaker -> cascading failures (Release It! p.110).
- Chosen: multi-source grouped results with provenance + resilient client.

## 7. Takeaways
- Never invent nutrition; look it up with a named source and per-100g basis.
- External integrations need timeouts + breaker before they touch the request path.
- Autofill is a convenience; the user stays the final authority (editable + source visible).

## 8. Security & authorization
401 gate before any external call; q passed as URL parameter via `URLSearchParams`; no string interpolation of user input into upstream URLs; results rendered as escaped React text.

## 9. Performance SLA
- OFF call: connect+read <= 5s (`AbortSignal.timeout`), breaker 5 failures / 30s cooldown.
- Debounce 250 ms; total UI response p95 < 1.5 s when OFF healthy, < 300 ms when degraded.

## 10. Evidence
- Spec judge: 100/100 with real KB citations (Release It! p.106-107 Timeouts, p.110 Circuit Breaker) + Context7 USDA FDC docs
- TDD red->green: tests/food-search-all.test.ts (3 tests) for per-100g normalization, null-on-missing (never 0), name dedupe; tests 78/78 PASS
- New GET /api/foods/search-all?q= groups NIN2026 (local, 5) + Open Food Facts (internet, 5); USDA optional only when FOOD_FDC_API_KEY present
- Resilient client: 5s AbortSignal timeout, 2 attempts, 4xx fast-fail (no retry), 5xx retry with full jitter, circuit breaker 5 failures/30s; lint_integration_resilience.py reports ZERO anti-patterns
- OFF `fields` param caused intermittent 503 -> removed; UI shows degraded hint while local results remain; circuit resets on redeploy
- Playwright 390px: 2 source groups, 10 results, autofill 212 kcal/100g, user edited to 888 then saved; DB persisted name + source='Open Food Facts' + calories=888 + servingSize='100g'; audit passed
- Build/typecheck/lint PASS; smoke 9/9; gate audit PASSED; verify-ui 4/4; URL 200
