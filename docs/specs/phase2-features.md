# Feature Spec: Phase 2 — i18n, Push, Family, Exercise, Finance

**Status:** Draft
**Tier:** 3 (Major — multi-feature, new domains, new models)
**Date:** 2026-11-16
**Grounding:** DDD Evans Ch.2 (ubiquitous language); WCAG 2.2 AA; Web Push spec (RFC 8030)

## 1. Problem & Scope

### 1.1 Ubiquitous language
- **Member**: a User in a Family.
- **Family**: a group of Members sharing food/exercise logs (read-only for others).
- **ExerciseLog**: a workout session with duration (min) and calories burned (kcal).
- **Expense**: a spending record with category (food/gym/other), amount (VND), date.
- **Locale**: `vi` | `en` — UI language preference.
- **PushSubscription**: a Web Push endpoint + keys for a User's device.

### 1.2 In-scope (5 features)
1. **i18n** (vi/en) — all UI labels via dictionary, persisted, toggle in nav/settings.
2. **Push notifications (real)** — Web Push with VAPID, subscribe/unsubscribe, meal reminders reach closed tab.
3. **Family** — create family, invite by email, members list, view member logs (read-only).
4. **Exercise** — log workout (type, duration, calories burned), daily burn total, chart.
5. **Finance** — log expense (category, amount, date), monthly total, chart, budget.

### 1.4 UX 5-state map (per new screen)
| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Family | "Chưa có gia đình" + CTA tạo | skeleton card | toast "Không tải được" | members list + invite |
| Exercise | "Chưa có buổi tập" + CTA | skeleton rows | toast | logs + burn chart |
| Finance | "Chưa có chi tiêu" + CTA | skeleton rows | toast | total + budget bar + chart |

### 1.3 Out-of-scope
- Real money transfer, bank sync.
- Wearable/device integration for exercise.
- Family editing others' logs (read-only only).
- Dark mode — already implemented (AC from previous spec).

## 2. Acceptance Criteria (Gherkin)

### i18n
AC-1: Given default locale vi, When user toggles to EN, Then all UI labels switch to English and preference persists after reload.
AC-2: Given a label missing in EN dictionary, Then fallback to vi with no crash.

### Push notifications
AC-3: Given permission granted, When user clicks "Bật thông báo", Then a PushSubscription is saved and a test notification is delivered.
AC-4: Given subscription exists, When meal time arrives, Then notification fires even with tab closed (service worker push event).
AC-5: Given user clicks "Tắt", Then subscription removed and no further notifications.

### Family
AC-6: Given user A creates family, When user B accepts invite by email, Then B appears in members list.
AC-7: Given A and B in same family, When A views family page, Then A sees B's calorie totals (read-only, no edit button).
AC-8: Given non-member, When accessing family page, Then 403.

### Exercise
AC-9: Given type/duration/calories, When POST /api/exercise, Then log created with burnt kcal.
AC-10: Given logs exist, When dashboard loads, Then net calories = intake − burned is displayed.
AC-11: Given missing fields, When POST, Then 400.

### Finance
AC-12: Given category/amount/date, When POST /api/expense, Then log created.
AC-13: Given monthly logs, When finance page loads, Then total + budget progress shown.
AC-14: Given negative amount, When POST, Then 400.

## 2b. Design tokens & Archetype
- Archetype: Dashboard (high-density), low-color tonal palette (Nordic Clean Light).
- Colors: primary emerald (#059669 light / #22c55e dark), bg #f8fafc/#09090b, card #ffffff/#18181b.
- Spacing: 4/8/12/16/24px tailwind scale. Elevation: `elevated` shadow + ring-inset.
- Typography: Geist Sans, 4-tier hierarchy (eyebrow/title/body/meta).

## 3. NFRs
- Security: BOLA defense on all new /api resources (owner/family scope).
- Performance: p95 < 300ms for list endpoints.
- Accessibility: i18n labels keep WCAG AA contrast; push permission has clear fallback.
- Privacy: expense data is per-user (not shared even in family).

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET/PUT | /api/locale | { locale } | { locale } | 401 |
| POST | /api/push | { subscription } | { ok } | 400/401 |
| DELETE | /api/push | — | { ok } | 401 |
| GET | /api/family | — | { family, members } | 401 |
| POST | /api/family | { name } | { family } | 400/409 |
| POST | /api/family/invite | { email } | { invited } | 400/403/404 |
| GET | /api/exercise | — | { logs } | 401 |
| POST | /api/exercise | { type, duration, calories, date? } | { log } | 400 |
| DELETE | /api/exercise/:id | — | { ok } | 403/404 |
| GET | /api/expense | — | { logs, total, budget } | 401 |
| POST | /api/expense | { category, amount, date } | { log } | 400 |
| DELETE | /api/expense/:id | — | { ok } | 403/404 |
| PUT | /api/budget | { amount } | { budget } | 400 |

All errors JSON `{ error: string }`. BOLA: resources scoped to owner or family.

## 5. Data model (new)
- User: + `locale String @default("vi")`
- Family: id, name, ownerId, createdAt
- FamilyMember: familyId, userId, role (owner/member), joinedAt (unique [familyId,userId])
- ExerciseLog: id, userId, type, duration (min), calories (kcal), date @db.Date
- Expense: id, userId, category, amount (Float), date @db.Date, note?
- Budget: userId @unique, amount (Float/month)
- PushSubscription: id, userId, endpoint @unique, p256dh, auth

Indexes: [userId,date] on ExerciseLog and Expense. FK onDelete Cascade.

## 6. Evidence
- Build: PASS
- Typecheck: PASS
- Lint: 0 errors (18 warnings)
- Tests: 4/4 PASS
- Smoke (dev-vm:3000): 9/9 PASS
- Visual gate: `npm run verify:ui` passed=true, failed_css=[], page_errors=[]
- Screenshots reviewed via `read` tool: exercise, finance, family, settings all render correctly with 5-state UI.
- Known config gap: Web Push button disabled until VAPID keys provided in .env (expected; documented in .env.example).
