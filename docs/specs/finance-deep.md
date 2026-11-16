# Feature Spec: Deep Finance + Exercise Goals + Family Roles

**Status:** Draft
**Tier:** 3 (Major — new models, business rules, permissions, notifications)
**Date:** 2026-11-16
**Grounding:** DDD Evans Ch.2; OWASP BOLA; RFC 8030 (Web Push)

## 1. Problem & Scope

### 1.1 Ubiquitous language
- **Household Budget**: monthly budget for the whole family. Managed by OWNER only.
- **Personal Budget**: monthly budget per member. Managed by the member.
- **FundSource**: `household` | `personal` — which budget an Expense draws from.
- **Category**: ăn uống / tập gym / mua sắm / đi lại / hóa đơn / giải trí / khác.
- **BudgetAlert**: notification when spending crosses 80% (warning) or 100% (exceeded) of a budget.
- **ExerciseGoal**: daily target calories-to-burn per user.
- **Streak**: consecutive days with ≥1 exercise log.

### 1.2 In-scope
1. **Finance deep**: two budgets (household + personal), Expense.fundSource, category breakdown chart, monthly history, progress bars, overspend alerts.
2. **Exercise deep**: daily burn goal, streak counter, 7-day trend chart.
3. **Family roles**: OWNER (manage household budget, invite/remove members, set member limits) vs MEMBER (log personal/household expenses, view, no budget management).
4. **Budget push alerts**: 80%/100% thresholds, deduplicated per budget per month.

### 1.3 Out-of-scope
- Money transfer, bank sync, receipt OCR.
- Editing others' expense logs.

## 2. Acceptance Criteria (Gherkin)

### Household + Personal budget
AC-1: Given family exists, When OWNER sets household budget 10M, Then members see it read-only.
AC-2: Given MEMBER tries to change household budget, Then 403.
AC-3: Given Expense with fundSource=household, When calculated, Then it reduces household remaining, not personal.
AC-4: Given Expense with fundSource=personal, When calculated, Then it reduces only that member's personal budget.

### Category breakdown
AC-5: Given expenses across categories, When finance page loads, Then category totals + percentage bars shown.
AC-6: Given month change, When selected, Then that month's data loads.

### Alerts
AC-7: Given spending crosses 80%, When expense created, Then one warning push sent (dedup per month).
AC-8: Given spending crosses 100%, When expense created, Then exceeded push sent.
AC-9: Given already alerted at 80%, When another expense still under 100%, Then no duplicate push.

### Exercise goals + streak
AC-10: Given goal 300 kcal/day, When user logs 350, Then goal marked complete.
AC-11: Given logs on consecutive days, When streak calculated, Then count shown.
AC-12: Given 7-day data, When page loads, Then trend chart rendered.

### Family roles
AC-13: Given OWNER, When removing member, Then member loses family access.
AC-14: Given MEMBER, When accessing household budget settings, Then 403.

## 3. UX 5-state map
| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Finance | "Chưa có chi tiêu" + CTA | skeleton charts | toast | 2 progress bars + category bars + history |
| Exercise | "Chưa có buổi tập" + CTA | skeleton | toast | goal ring + streak + trend |

## 3b. Design tokens
Emerald primary, Nordic light, spacing 4/8/12/16/24px, `elevated` shadow, Geist Sans, charts via inline SVG.

## 3c. Architectural invariants
- Default-deny on household budget writes: only OWNER role.
- Alert dedup key: (budgetId, month, threshold) stored in DB.
- All cross-user queries verify family membership first (BOLA).
- Data flow: API route → verify role → business calc → Prisma → JSON. No business logic in component.

## 4. API Contract (REST endpoints)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET/PUT | /api/budget/household | { amount } | { budget } | 401/403 |
| GET/PUT | /api/budget/personal | { amount } | { budget } | 401 |
| GET | /api/finance/summary?month=YYYY-MM | — | { household, personal, categories, history } | 401 |
| POST | /api/expense | { category, amount, fundSource, date, note? } | { log, alerts } | 400 |
| GET/PUT | /api/exercise/goal | { calories } | { goal } | 401 |
| GET | /api/exercise/streak | — | { streak, trend } | 401 |
| DELETE | /api/family/members/:id | — | { ok } | 403/404 |
| GET | /api/budget/alerts | — | { alerts } | 401 |
| PUT | /api/family/members/:id/role | { role } | { ok } | 403 |

All errors JSON `{ error: string }`. BOLA: family/owner scope enforced server-side.

## 5. Data Schema (Prisma models)
- Family: + `householdBudget Float @default(10000000)`
- User: + `personalBudget Float @default(2000000)`
- Expense: + `fundSource String @default("personal")`
- BudgetAlert: id, budgetKey, month, threshold, createdAt (unique [budgetKey,month,threshold])
- ExerciseGoal: userId @unique, calories @default(300)
- FamilyMember: + role already exists (owner/member)

## 6. Evidence
- Spec judge: 97/100 auto-approved
- Build: PASS · Typecheck: PASS · Lint: 0 errors (18 warnings) · Tests: 4/4
- Smoke (dev-vm:3000): 9/9 PASS
- Visual gate: passed=true, failed_css=[], page_errors=[]
- Screenshots reviewed via `read`: finance (2 budgets + category bars + fundSource + history), exercise (goal ring + streak + 7-day trend) render correctly
- New models: BudgetAlert, ExerciseGoal; Family.householdBudget, User.personalBudget, Expense.fundSource
- Alert logic: 80%/100% dedup per month; household alerts push to all family members
