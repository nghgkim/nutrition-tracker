# Feature Spec: Content Accuracy + Dark Mode Stability + Training & Meal Guidance

**Status:** Draft
**Tier:** 3 (Major — data correction, CSS fix, new guidance domain)
**Date:** 2026-11-17

## 1. Problem & Scope

### 1.1 Problems (from user + audit)
1. **Food names misspelled**: 55 names contain `μ` (TCVN3 decode bug where `à`→`μ`), e.g. "Thịt gμ" → "Thịt gà", "Cμ chua" → "Cà chua"; plus "Bánh mỳ"→"Bánh mì", "Mỳ sợi"→"Mì sợi".
2. **Dark mode flashes white on tab switch**: FOUC — theme applied via inline script + React state, but tab restore paints light background first.
3. **Training lacks guidance**: no suggested exercises, no weekly schedule, no meal plan tied to calorie goal.

### 1.2 In-scope
- Fix all 55+ misspelled food names in seed + DB (with regression test).
- Eliminate dark-mode white flash on load/tab-switch.
- New: exercise suggestions by goal, weekly training schedule with completion checkboxes, meal plan by calorie target.

### 1.3 Out-of-scope
- Re-transcribing the whole VFCT2007 table (only fix known encoding/spelling defects).

## 2. Acceptance Criteria (Gherkin)

### Spelling
AC-1: Given seed data, When searching "ca chua" (no diacritics), Then "Cà chua" found (not "Cμ chua").
AC-2: Given DB, When listing foods, Then zero names contain `μ` or `mỳ`.
AC-3: Given fixed names, When user logs food, Then correct name displayed.

### Dark mode
AC-4: Given dark mode saved, When switching browser tab back, Then no white flash (paint stays dark from first frame).
AC-5: Given fresh load, When page paints, Then `html.dark` class present before first paint (no FOUC).

### Training guidance
AC-6: Given goal "giảm cân"/"tăng cơ"/"duy trì", When viewing suggestions, Then recommended exercises listed with sets/reps/duration.
AC-7: Given weekly schedule, When user checks a day done, Then progress persists.
AC-8: Given daily calorie target, When viewing meal plan, Then breakfast/lunch/dinner/snack with kcal per meal summing to target.
AC-9: Given no plan customized, When page loads, Then default plan generated from target.

## 3. UX 5-state map
| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Training plan | "Chưa có lịch" + CTA | skeleton | toast | 7-day grid + suggestions |
| Meal plan | n/a (always generated) | skeleton | toast | 4 meals with kcal bars |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 4/8/12/16/24px, `elevated`, Geist Sans.

## 3c. Architectural invariants
- Spelling fix: deterministic mapping table in seed; no manual per-row edits that can drift.
- Dark mode: theme class set synchronously in `<head>` before paint via inline script (already present) + `color-scheme` CSS + localStorage read before React. Verify with Playwright screenshot at first paint.
- Guidance data: sourced from authoritative references with citation in spec (ACSM/AHA/Harvard Health/NIN Vietnam), stored as typed constants with `source` field.

## 4. API Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET/PUT | /api/training-plan | { week: [{day, done}] } | { week } | 401 |
| GET | /api/training/suggestions?goal= | — | { exercises } | 401 |
| GET | /api/meal-plan | — | { meals, target } | 401 |

All errors JSON `{ error: string }`. BOLA: per-user plan.

## 5. Data Schema (Prisma models)
- TrainingPlan: userId, week Json, updatedAt (userId @unique)
- ExerciseSuggestion / MealTemplate: typed constants in `src/lib/guidance.ts` with `source` citation (no DB needed for templates)

## 6. Data sources (guidance)
- Exercise: ACSM's Guidelines for Exercise Testing and Prescription (frequency/intensity by goal); WHO Physical Activity Guidelines 2020.
- Meals: NIN Vietnam (Viện Dinh dưỡng) meal distribution 25-30% breakfast / 30-40% lunch / 25-30% dinner / 5-10% snack (already cited in earlier web research from viendinhduong.vn school-meal guidance PDF).

## 7. Evidence
- Spec judge: 97/100 auto-approved
- Build: PASS (after clean npm ci with max-old-space-size=4096; fixed bus error from corrupted node_modules)
- Typecheck: PASS · Lint: 0 errors · Tests: 4/4
- Smoke (Docker :3001): 9/9 PASS
- Visual gate: passed=true, failed_css=[], page_errors=[]
- Screenshots reviewed via `read`: exercise page shows guidance cards (WHO/ACSM sources), 7-day schedule, NIN meal plan
- Verified live: register 201; search 'ca chua' -> Cà chua (API accent-insensitive); DB zero μ/mỳ (56 bad rows deleted + reseeded)
- Dark mode verified via Playwright same-context: class 'dark' at first paint, html bg rgb(9,9,11), no white flash
- New models: TrainingPlan; new APIs: training-plan, training/suggestions, meal-plan
- Migration `training_guidance` applied in DB container
