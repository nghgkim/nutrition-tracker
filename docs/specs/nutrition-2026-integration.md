# Feature Spec: Integrate NIN 2026 Requirements + Asian BMI + Nutrient Rankings

**Status:** Draft
**Tier:** 3 (Major — new domain data, calculation logic, UI)
**Date:** 2026-11-17
**Grounding:** kb-equivalent — web research from dulieuphapluat.vn (official-derived data)

## 1. Problem & Scope

### 1.1 Problems
1. Goal mặc định 2000 kcal là giá trị ghi nhãn chung (TT 30/2026), KHÔNG phải nhu cầu cá nhân theo tuổi/giới/lao động.
2. BMI category dùng ngưỡng WHO toàn cầu (25 = béo phì), SAI với người Châu Á theo QĐ 2892/QĐ-BYT (23 = thừa cân).
3. Chưa gợi ý thực phẩm giàu chất theo nhu cầu.

### 1.2 In-scope
1. Bảng nhu cầu calo 15 nhóm tuổi × giới tính × 3 mức lao động (từ NIN 2026), thay goal mặc định.
2. BMI classification theo QĐ 2892/QĐ-BYT (5 mức) + cảnh báo vòng bụng (≥90 nam / ≥80 nữ).
3. Gợi ý thực phẩm giàu protein/sắt/canxi từ 1590 foods trong DB.

### 1.3 Out-of-scope
- Tình trạng sinh lý (thai/cho bú) — dùng mặc định "không có thai".
- 124 chỉ tiêu vi chất đầy đủ (chỉ calo + 4 macro + sắt/canxi).

## 2. Acceptance Criteria (Gherkin)

AC-1: Given user 18-29, male, lao động nhẹ, When recommended goal calculated, Then 2205 kcal (source value).
AC-2: Given user 18-29, female, lao động nhẹ, When calculated, Then 1760 kcal.
AC-3: Given age/gender/activity saved, When profile loads, Then recommended goal shown with source citation.
AC-4: Given BMI 23.5, When classified, Then "Thừa cân" (Asian standard), not "Bình thường".
AC-5: Given BMI 25.5, When classified, Then "Béo phì độ I".
AC-6: Given waist 92cm male, When evaluated, Then both cap警告 shown.
AC-7: Given nutrient "protein", When suggestions requested, Then top-5 foods by protein/100g from DB.
AC-8: Given current daily goal differs from recommended, When user views, Then "Áp dụng khuyến nghị" button available.

## 3. UX 5-state map
| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Profile | n/a | skeleton | toast | recommended goal + source + apply button |
| BMI card | n/a | skeleton | toast | category with Asian standard note + waist alert |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 4/8/12/16/24px, `elevated`, Geist Sans, source citation in `text-[10px] text-primary/70`.

## 3c. Architectural invariants
- All recommended values from scraped NIN 2026 table — no hardcoded guesses. Fallback if missing = 2000 with "estimate" flag.
- BMI thresholds as typed constants from QĐ 2892 — source cited in UI.
- Nutrient suggestions query DB (global foods only), ordered by nutrient desc, limit 5.
- No business logic in React components; helpers in `src/lib/`.

## 4. API Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/nutrition/recommended?age=&gender=&activity= | — | { calories, protein, source } | 400/401 |
| GET | /api/nutrition/bmi?weight=&height=&waist=&gender= | — | { bmi, category, waistAlert, source } | 400/401 |
| GET | /api/nutrition/rich?nutrient=protein\|iron\|calcium | — | { foods } | 400/401 |

All errors JSON `{ error: string }`.

## 5. Data Schema (Prisma models)
No new models — use existing User (age, gender, activity, height, targetWeight), Goal.

## 6. Data sources
- Calo: https://dulieuphapluat.vn/cong-cu/nhu-cau-dinh-duong/18-29-tuoi.html (2205 kcal nam-nhẹ, 1760 nữ-nhẹ) + 14 other age pages.
- BMI: https://dulieuphapluat.vn/cong-cu/danh-gia-tinh-trang-dinh-duong.html — QĐ 2892/QĐ-BYT (22/10/2022).
- Nutrients: existing DB (1590 NIN2026 foods).

## 7. Evidence
- Spec judge: 97/100 auto-approved
- Scraper: 15 age pages -> 60 calorie values (18-29 male light 2205, female light 1760 verified)
- DB: 1590 foods, 691 with Fe/Ca (migration nutrition_minerals)
- APIs verified live: recommended (2205/1760), BMI (23.5 -> Thừa cân Asian; waist 92cm alert), rich protein top5
- Screenshot reviewed: profile shows recommended goal + source + apply button
- Build/typecheck PASS · Lint 0 errors · Tests 4/4 · Smoke 9/9 · Visual passed=true
