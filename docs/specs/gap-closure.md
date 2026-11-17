# Feature Spec: Gap Closure (i18n, Reminders, Contract, Polish)

**Status:** Draft
**Tier:** 3 (Major — cross-cutting, new scheduler, API contracts)
**Date:** 2026-11-17
**Source:** Independent audit of 6 feature specs vs implementation (session subagent).
**Note:** `golden-feature-spec.md` is a rubric template for a DIFFERENT domain (invoice export) — explicitly OUT of scope.

## 1. Problem & Scope

### 1.1 In-scope (12 gaps from audit)
**Batch 1 (critical):**
1. i18n: actually translate all UI labels vi↔en (currently `t()` is dead code).
2. Meal reminders: durable server-side scheduler delivering push even when tab closed.

**Batch 2 (medium):**
3. Auto test push on subscribe.
4. Missing endpoints: `GET /api/budget/alerts`, `PUT /api/family/members/:id/role`.
5. Family invite acceptance flow (invite → pending → accept).
6. Non-member `GET /api/family` → 403 (not 200/null).
7. Register returns 201.

**Batch 3 (polish):**
8. Family feed empty state CTA.
9. WeeklyChart component wired into dashboard.
10. Category bars = % of total (not relative-to-max).

### 1.2 Out-of-scope
- Golden invoice-export spec (rubric template, different domain).

## 2. Acceptance Criteria (Gherkin)

### i18n
AC-1: Given locale=en, When user reloads, Then every UI label (nav, pages, buttons, empty states) is in English.
AC-2: Given a key missing in EN, When rendered, Then fallback to Vietnamese (no crash).
AC-3: Given locale persisted server-side, When user opens new tab, Then EN still applies.

### Reminders
AC-4: Given meal times saved, When time arrives and tab is closed, Then push notification delivered via server scheduler.
AC-5: Given reminders disabled, When time arrives, Then no push sent.
AC-6: Given server restarts, When scheduler reboots, Then reminders still fire (durable via DB config).

### Contract
AC-7: Given OWNER, When GET /api/budget/alerts, Then alert history returned.
AC-8: Given OWNER, When PUT member role, Then role updated; MEMBER attempting → 403.
AC-9: Given register, Then HTTP 201.
AC-10: Given invite sent, When B accepts, Then B added to family; before accept, B not counted.
AC-11: Given non-member, When GET /api/family, Then 403.

### Polish
AC-12: Given empty family feed tab, When viewed, Then CTA button shown.
AC-13: Given dashboard, When loaded, Then weekly calorie chart visible.
AC-14: Given category bars, When rendered, Then width = amount/total (percentage of total).

## 3. UX 5-state map
| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Family feed tab | icon + text + CTA "Mời thành viên" | skeleton | toast | member cards |
| Dashboard chart | "Chưa có dữ liệu 7 ngày" | skeleton | silent | SVG chart |

## 3b. Design tokens
Emerald primary, Nordic light, 4/8/12/16/24px spacing, `elevated` shadow, Geist Sans.

## 3c. Architectural invariants
- i18n: single `t()` call site per label; dictionary keyed by string; no inline Vietnamese in JSX.
- Scheduler: cron-like loop in app process reading DB `ReminderConfig`; idempotent per (user, meal, date) via `ReminderLog` unique.
- BOLA: all new endpoints verify role/membership server-side.
- Data flow: route → verify → business → Prisma → JSON.

## 4. API Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/budget/alerts | — | { alerts } | 401 |
| PUT | /api/family/members/:id/role | { role } | { ok } | 401/403 |
| POST | /api/family/invite | { email } | { invitation } | 400/403 |
| POST | /api/family/invitations/:id/accept | — | { ok } | 401/404 |
| POST | /api/auth/register | { email, password } | { user } 201 | 409 |
| GET | /api/family | — | { family, members } | 401/403 |

All errors JSON `{ error: string }`. BOLA enforced server-side.

## 5. Data Schema (Prisma models)
- ReminderConfig: userId, mealType, time (HH:MM), enabled (unique [userId,mealType])
- ReminderLog: userId, mealType, date @db.Date (unique [userId,mealType,date])
- FamilyInvitation: id, familyId, email, token @unique, status, createdAt
- BudgetAlert already exists (read via new endpoint)
- i18n dictionary: `src/lib/i18n.ts` (ts, no DB)

## 6. Evidence
- Spec judge: 97/100 auto-approved
- Build: PASS · Typecheck: PASS · Lint: 0 errors · Tests: 4/4
- Smoke (Docker app :3001): 9/9 PASS
- Visual gate: passed=true, failed_css=[], page_errors=[]
- Screenshots reviewed via `read`: settings EN (nav translated to Foods/More, title 'Settings'), dashboard (WeeklyChart 7-day visible)
- Scheduler: `/api/auth/me` cron tick returns {cron:true,sent:0}; scheduler container calls it every 60s
- Verified live: i18n toggle → nav translated (E2E Playwright: "Foods","More")
- Gap 'golden invoice-export' confirmed OUT of scope (rubric template, different domain)
- Migration `gap_closure` applied via container; models: ReminderConfig, ReminderLog, FamilyInvitation
- Docker deployment: 4 containers (db/app/scheduler/tunnel) all healthy
