# Feature Spec: Additional Features (Dark Mode, PWA, Profile, Notifications, Search)

**Status:** Draft (retroactive)
**Tier:** 2 (Minor feature)
**Date:** 2026-11-16

## 1. Problem & Scope

### 1.1 User story
As a user, I want dark mode, offline PWA support, a profile/calorie calculator, meal reminders, and fast accent-insensitive food search, so the app feels complete and usable daily.

### 1.2 In-scope
1. Dark mode toggle (persisted, no FOUC).
2. PWA: manifest, service worker, installable.
3. Profile page: BMR/TDEE/BMI calculator + weight tracking (merged).
4. Notifications: meal reminders, goal alerts, settings page.
5. Accent-insensitive, debounced food search.
6. Auth middleware (route protection).

### 1.3 UX 5-state map (per screen)
| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Profile | "Chưa có dữ liệu cân nặng" + CTA | skeleton card | toast "Không tải được" | stats + chart + form |
| Settings | n/a | button spinner | inline error | saved confirmation |
| Foods search | "Không tìm thấy món" + CTA | skeleton rows | toast | filtered list |

### 1.4 Out-of-scope
- Push notifications (requires server + VAPID keys).
- Barcode scanning.
- Multi-language.

## 2. Acceptance Criteria (Gherkin)

### Dark mode
AC-1: Given the app loads, When user prefers dark color scheme, Then dark theme is applied without flash.
AC-2: Given user clicks toggle, Then theme switches and preference is persisted in localStorage.

### PWA
AC-3: Given the app is served over HTTPS, When user visits, Then manifest is valid and service worker registers.
AC-4: Given offline, When user visits cached page, Then page loads from cache.

### Profile / Calorie calculator
AC-5: Given height/age/gender/activity, When user saves, Then BMR, TDEE, BMI are calculated and daily goal is updated.
AC-6: Given weight logs exist, When user views profile, Then weight chart and history are shown.

### Notifications
AC-7: Given notification permission granted, When user sets meal times and saves, Then reminders are scheduled.
AC-8: Given permission denied, When user visits settings, Then a message explains how to enable.

### Search
AC-9: Given foods exist, When user types "banh ep" (no diacritics), Then "Bánh ép Huế" appears in results.
AC-10: Given user types quickly, When searching, Then no flicker (debounced, client-side filter).

### Auth middleware
AC-11: Given no session cookie, When user visits /dashboard, Then redirect to /login.
AC-12: Given invalid token, When user visits protected route, Then redirect to /login.

## 2b. Design tokens
- Colors: primary emerald (#059669 light / #22c55e dark), background #f8fafc/#09090b, card #ffffff/#18181b
- Spacing: 4/8/12/16/24/32/48px (Tailwind scale)
- Elevation: multi-tier shadow (0 1px 2px + 0 8px 24px)
- Typography: Geist Sans, 4-tier hierarchy (eyebrow/title/body/meta)

## 3. NFRs
- Performance: search debounce 200ms, no re-fetch on keystroke.
- Security: middleware validates JWT on every request; no bypass for protected routes.
- Accessibility: toggle has aria-label; form labels present.

## 3b. Architectural invariants
- Route protection via middleware (JWT validation on every request).
- Client-side search filter (no server round-trip per keystroke).
- Accent normalization: NFD + đ→d (handles Vietnamese diacritics).
- Dark mode: CSS variables + localStorage + inline script (no FOUC).
- PWA: service worker cache-first for GET, bypass API.

## 4. Contract (REST)
- GET /api/profile → { profile }
- PUT /api/profile { height, age, gender, activity, targetWeight } → { profile }
- GET /api/weight → { logs }
- POST /api/weight { weight, date?, note? } → { log }
- DELETE /api/weight/:id → { ok }

## 5. Evidence
- Build: pass
- Typecheck: pass
- Lint: 0 errors
- Tests: 4/4 pass
- Smoke: 9/9 pass
