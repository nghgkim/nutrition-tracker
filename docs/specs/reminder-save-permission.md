# Feature Spec: Decouple Reminder Save from Notification Permission (Tier 1 Patch)

**Status:** Draft
**Tier:** 1 (Bugfix — conditional fix + test)
**Date:** 2026-11-20
**Grounding:** Principle VII (Five Whys); feedback invariant

## 1. Problem & Context (Five Whys)
"Lưu cài đặt" button is `disabled={permission !== "granted"}`. Reminder times are persisted server-side via `/api/reminders` and delivered by a server scheduler; they do not depend on browser Notification permission.

1. Why is save disabled? It was coupled to browser push permission.
2. Why is that wrong? The saved data is server-side config; permission only affects local browser push delivery.
3. Why did I claim VAPID missing? I misread the disabled state without checking `.env` (keys are present).
4. Why does it matter? Users cannot save reminder times until they grant notifications — blocking a valid action.
5. Why fix now? Owner asked why the key was missing; investigation found a different root cause.
Root cause: **UI disable condition tied to the wrong prerequisite**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given permission "default", When settings loads, Then "Lưu cài đặt" is enabled.
AC-2: Given permission "granted", When settings loads, Then button remains enabled.
AC-3: Given save clicked with permission "default", Then 3 reminder PUTs run and a success toast appears.
AC-4: Given browser has no Notification API, When settings loads, Then button is still enabled (server scheduling works).
AC-5: Given push toggle, When VAPID key is present, Then it remains enabled as before.
AC-6: Given build, Then typecheck/lint/tests pass.

## 3. Architecture
```mermaid
flowchart LR
  UI[Lưu cài đặt] --> SAVE[save(): 3 PUT /api/reminders]
  SAVE --> TOAST[success/error]
  PERM[Notification.permission] --> PUSH[push toggle only]
```
- Remove `disabled={permission !== "granted"}` from the save button; keep permission gating only on push UI.
- Pure helper `canSaveReminders()` in `src/lib/reminder-permission.ts` returns true unconditionally (documents intent, testable) — used by the button.

## 4. Failure modes
- No Notification API -> save still works (server scheduler unaffected).
- Duplicate saves -> toast dedupe handles consecutive identical messages.

### QA harness
| Area | Type | Command |
|---|---|---|
| Pure helper | unit (TDD) | `npm test -- tests/reminder-permission.test.ts` |
| UI | Playwright | 390px, permission default, click save, toast |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 5. Contract / Schema
No endpoint or schema change.

## 6. Trade-offs & rejected alternatives
- Rejected: leave disabled and ask users to grant notification -> blocks unrelated action.
- Rejected: remove push gating too -> subscribing without permission fails; keep it.
- Chosen: decouple save from permission only.

## 7. Takeaways
- Verify the actual disabled condition before blaming configuration; my earlier VAPID claim was wrong.
- Server-side features must not depend on browser-only state.
- Pure helpers can encode "always allowed" decisions so intent is testable.

## 8. Security & performance
No new request path; 401 gate unchanged; 3 bounded PUTs as before.

## 9. Evidence
- Spec judge: 100/100
- Root cause corrected: VAPID keys ARE configured in .env, app container and client bundle; earlier claim was wrong. Real cause was disabled={permission !== 'granted'}
- TDD red->green: tests/reminder-permission.test.ts (1 test, 4 cases) written first; canSaveReminders always true; tests 48/48 PASS
- Playwright 390px: permission "denied" yet save button enabled, click -> toast "Đã lưu giờ nhắc nhở", audit passed
- Push toggle keep permission/VAPID gating unchanged
- Build/typecheck/lint PASS; smoke 9/9; URL 200
