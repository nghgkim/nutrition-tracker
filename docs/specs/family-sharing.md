# Feature Spec: Family Sharing Toggle (Hybrid Model)

**Status:** Draft
**Tier:** 2 (Minor feature)
**Date:** 2026-11-16

## 1. Problem & Scope

### 1.1 User story
As a user in a family, I want each feature to default to personal, but toggle "Share with family" when I want members to see my data — so I keep privacy by default while enabling family monitoring on demand.

### 1.2 Ubiquitous language
- **ShareScope**: `personal` (default) | `family` — visibility of a user's Exercise/Expense/Weight logs.
- **Family Feed**: aggregated view of members who opted into sharing for a given feature.

### 1.3 In-scope
1. User setting `shareScope` per feature: exercise, finance, weight (default personal).
2. Family page: tabs "Calo" / "Tập luyện" / "Chi tiêu" / "Cân nặng" — only show members who opted in.
3. API filters by shareScope: non-shared data invisible to other members (BOLA defense).
4. Web Push: send test notification when subscribed (VAPID configured).

### 1.4 Out-of-scope
- Editing others' data (read-only always).
- Sharing Home budget (expense detail) — only aggregate by category.

## 2. Acceptance Criteria (Gherkin)

### ShareScope
AC-1: Given default, When user checks shareScope, Then all three features = personal.
AC-2: Given user toggles exercise to family, When member views family feed "Tập luyện", Then user's exercise logs appear.
AC-3: Given user keeps finance personal, When member views family feed "Chi tiêu", Then user's expense data does NOT appear (no data leak).
AC-4: Given non-member, When GET family feed, Then 403.

### Family Feed tabs
AC-5: Given 4 tabs, When user switches, Then correct feature data loads for opted-in members only.
AC-6: Given no members opted in, When viewing a tab, Then empty state with CTA.

### Web Push
AC-7: Given VAPID keys configured, When user clicks "Bật thông báo" in Settings, Then subscription saved and test notification delivered.
AC-8: Given subscription, When POST /api/push/test, Then push service returns 200/201.

## 3. UX 5-state map
| Screen | Empty | Loading | Error | Success |
|---|---|---|---|---|
| Family Feed tab | "Chưa có thành viên chia sẻ" | skeleton rows | toast | member cards with data |

## 4. Design tokens
Emerald primary, Nordic light, spacing 4/8/12/16/24px, `elevated` shadow, Geist Sans.

## 3b. Architectural invariants
- Default-deny: family feed filters by shareScope on server; client never receives non-shared rows.
- BOLA: verify family membership before any cross-user query.
- Push: VAPID keys server-side only; public key exposed to client.

## 5. NFRs
- Security: BOLA — family feed MUST filter by shareScope; personal data never leaks.
- Privacy: default personal (opt-in sharing).

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET/PUT | /api/sharing | { exercise?, finance?, weight? } | { sharing } | 401 |
| GET | /api/family/feed?feature=exercise | — | { members: [{name, value}] } | 401/403 |
| POST | /api/push/test | — | { ok } | 401/503 |
| GET | /api/push | — | { subscribed } | 401 |
| DELETE | /api/push | — | { ok } | 401 |
| GET | /api/family/members | — | { members } | 401/403 |

All errors JSON `{ error: string }`. BOLA: family feed filters by shareScope on server.

## 5. Data model
- User: + `shareExercise Boolean @default(false)`, `shareFinance Boolean @default(false)`, `shareWeight Boolean @default(false)`, `locale String @default("vi")`
- PushSubscription: id, userId, endpoint @unique, p256dh, auth, createdAt
- Data flow: API route parse request → verify family membership → query with shareScope filter → JSON response. No business logic in route.

## 6. Evidence
- Spec judge: 97/100 auto-approved
- Build: PASS · Typecheck: PASS · Lint: 0 errors · Tests: 4/4
- Smoke (dev-vm:3000): 9/9 PASS
- Visual gate: passed=true, failed_css=[], page_errors=[]
- Screenshots reviewed via `read`: settings (push active, sharing toggles, i18n), family (empty state) render correctly
- VAPID keys generated & configured in .env; Web Push test endpoint ready
