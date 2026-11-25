# Feature Spec: Food Search Autofill in Add-Food Dialog (Tier 2)

**Status:** Draft
**Tier:** 2 (Minor — API + UI, pure ranking helper)
**Date:** 2026-11-25
**Grounding:** `api-and-domain-design`, `frontend-craftsman`; data-source integrity invariant

## 1. Problem & Context
Add-food form requires users to manually enter calories/macros/serving size. Users do not know the breakdown for a dish name. Owner asked for a search tool that fills from a name.

### Five Whys
1. Why hard? Nutrition values are not derivable from a name alone.
2. Why not ask an LLM? That fabricates data (explicit project invariant).
3. What real source exists? 1,590 NIN2026 foods with calories/macros/servingSize in DB.
4. Why not reuse `/api/foods?q=`? It returns all matching rows unbounded (heavy payload).
5. Why now? Owner asked for a built-in search tool.
Root cause: **no bounded, ranked lookup surface connecting name input to real nutrition data**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given add-food dialog, When user types ≥2 characters, Then a dropdown shows up to 8 NIN2026 matches without leaving the dialog.
AC-2: Given results, When a result is clicked, Then name/calories/protein/carbs/fat/servingSize are filled into the form.
AC-3: Given filled form, When saved, Then the new custom food carries `source = "NIN2026"` (traceable) — not a fabricated estimate.
AC-4: Given no match, When results empty, Then an empty message is shown and user can still type manually.
AC-5: Given debounce, When typing fast, Then only the latest query is used (stale responses discarded).
AC-6: Given 375px, When dropdown renders, Then touch >= 44px, no horizontal leak, dark mode clean.
AC-7: Given unauthenticated call, When suggest endpoint hit, Then 401 via problemResponse.
AC-8: Given build/tests, When run, Then pass.

## 3. Architecture
```mermaid
flowchart LR
  INPUT[name input] --> DEBOUNCE[debounced query]
  DEBOUNCE --> API[GET /api/foods/suggest?q=]
  API --> HELPER[rankFoodMatches pure]
  HELPER --> LIST[top 8 with source]
  LIST --> CLICK[autofill form]
  CLICK --> POST[POST /api/foods]
```
- Pure helper `rankFoodMatches` in `src/lib/food-suggest.ts`, TDD tested: exact > prefix > substring, capped, accent-insensitive via `removeDiacritics`.
- New bounded endpoint `/api/foods/suggest?q=` reads only public foods (`userId: null`), returns ≤8 compact fields incl. `source`.
- API validates auth first; stale client responses guarded by a request key (like restaurant filters).
- No fabricated values; manual entry still allowed.

### Verification harness
| Area | Type | Command |
|---|---|---|
| Pure helper | unit (TDD) | `npm test -- tests/food-suggest.test.ts` |
| API | curl | suggest q=cơm -> ≤8 results, 401 unauth |
| UI | Playwright | type -> results -> click -> fields filled -> save -> source |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

### Failure modes
- Empty/short query -> no request.
- API failure -> inline "Không thể tải gợi ý" text, manual entry intact.
- Duplicate names -> dedupe by normalized name.

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/foods/suggest?q= | — | { foods: [{id,name,calories,protein,carbs,fat,servingSize,source}] } | 401 |

New endpoint only; existing `/api/foods` unchanged.

## 5. Data Schema
| Model | Field | Change |
|---|---|---|
| Food | source | existing field used for traceability; no schema change |

## 6. Trade-offs & rejected alternatives
- Rejected: LLM name→nutrition estimate -> fabrication.
- Rejected: reuse `/api/foods?q=` unbounded -> heavy payload, no ranking.
- Rejected: fetch crawler candidates -> those need exact name match too and add external dependency.
- Chosen: bounded ranked lookup over local NIN2026 data.

## 7. Takeaways
- When data cannot be derived, provide lookup against a trusted corpus instead of guessing.
- Ranking (exact/prefix/substring) should be a pure, tested helper.
- Autofill must preserve provenance (`source`) so users know the number is real.

## 8. Security
401 gate; parameterized Prisma query; user cannot inject via q (bound as parameter).

## 9. Performance SLA
`/api/foods/suggest` reads ≤1,590 rows in memory then slices ≤8; p95 < 80 ms. Debounce 250 ms client-side.

## 10. Evidence
- Spec judge: 100/100
- TDD red->green: tests/food-suggest.test.ts (3 tests) written first; exact > prefix > substring ranking, accent-insensitive, capped 8; tests 75/75 PASS
- New GET /api/foods/suggest?q= (401 gate, q>=2 chars, userId:null only, <=8 compact fields with source)
- Add-food dialog: 250ms debounced search dropdown, click autofills name/calories/protein/carbs/fat/servingSize, toast names NIN2026 as source
- Provenance fix: POST /api/foods now persists `source` (<=40 chars); autofilled foods store NIN2026 (verified DB: "Bún chả" | NIN2026 | 136), no fabricated values
- Playwright 390px: 6-8 suggestions for "bún chả"/"cơm", autofill + save toast, audit passed
- Build/typecheck/lint PASS; smoke 9/9; verify-ui 4/4; URL 200
