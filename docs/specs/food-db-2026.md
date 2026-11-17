# Feature Spec: Food DB Migration to NIN 2026 (Thông tư 30/2026/TT-BYT)

**Status:** Draft
**Tier:** 3 (Major — full data replacement, 1669 records, new source)
**Date:** 2026-11-17
**Grounding:** Data Source Verification invariant; DDD ubiquitous language

## 1. Problem & Scope

### 1.1 Problem
Current DB uses VFCT 2007 (526 foods) with TCVN3 decode defects (fixed but stale). New authoritative source available: dulieuphapluat.vn, updated per **Thông tư 30/2026/TT-BYT** (effective 10/07/2026): 851 thực phẩm + 818 món ăn chế biến = 1669 records, 124 nutrients, 15 groups.

### 1.2 In-scope
- Scrape 15 category pages → list of food URLs + calories.
- Scrape 851 detail pages → protein/carbs/fat (per 100g).
- Scrape 818 prepared-dish pages → calories (+ macros if available).
- Replace entire Food table (keep user-custom foods intact).
- Regenerate seed.ts from scraped data with source citation.
- Update README data source section.

### 1.3 Out-of-scope
- Full 124 nutrients (only calories + 4 macros needed by app).
- Legal/label comparison sections (scrape only nutrient table).

## 2. Acceptance Criteria (Gherkin)

AC-1: Given source pages, When scraper runs, Then ≥1600 foods extracted with non-empty Vietnamese names.
AC-2: Given a food detail page, When parsed, Then calories/protein/carbs/fat extracted as numbers (Vietnamese decimal comma handled).
AC-3: Given zero bad chars (μ, mỳ, TCVN3 artifacts), When checking all names, Then 0 defects.
AC-4: Given migration done, When DB queried, Then ≥1600 global foods, 0 old 2007-only records (except names also in new source), all user-custom foods preserved.
AC-5: Given search "banh bich cot", When searching, Then "Bánh bích cốt" found with 349 kcal (new source value).
AC-6: Given README, When read, Then source cites Thông tư 30/2026/TT-BYT + URL.
AC-7: Given detail page has no macro data, When seeded, Then macro = 0 and source noted.

## 3. UX 5-state map
No UI change — data-only migration. Existing foods page states apply.

## 3b. Design tokens
N/A (no UI change).

## 3c. Architectural invariants
- Scraper is deterministic: single script `scripts/scrape-nin2026.py` with source URL constant; re-run reproducible.
- Data validation: reject rows with empty name or NaN calories; log skipped.
- Source field set to "NIN2026" for all seeded foods; user-custom foods unchanged (userId != null).
- No fabrication: only values from scraped pages; missing macros = 0 (documented).

## 4. API Contract (REST)
No new endpoints. Existing GET /api/foods returns new data.

## 5. Data Schema (Prisma models)
No schema change. Existing Food model: name, calories, protein, carbs, fat, servingSize="100g", source="NIN2026".

## 6. Data sources
- Primary: https://dulieuphapluat.vn/cong-cu/gia-tri-dinh-duong-thuc-pham.html (cập nhật Thông tư 30/2026/TT-BYT, 851 thực phẩm)
- Prepared dishes: https://dulieuphapluat.vn/cong-cu/gia-tri-dinh-duong-mon-an.html (818 món)
- Verification sample: https://dulieuphapluat.vn/cong-cu/gia-tri-dinh-duong-thuc-pham/banh-bich-cot.html (349 kcal, 12.3g đạm, 1.3g béo, 72.1g bột đường)

## 7. Evidence
- Scraper: `python3 scripts/scrape-nin2026.py` -> 866 food links + 741 dish links -> 1590 unique items, 0 bad chars, all calories>0
- DB after migration: 1593 total (1590 NIN2026 + 3 user-custom preserved)
- Verification: Bánh bích cốt 349 kcal / 12.3g protein / 72.1g carbs / 1.3g fat (matches source page)
- Build/smoke/visual: see evidence from final QC run
