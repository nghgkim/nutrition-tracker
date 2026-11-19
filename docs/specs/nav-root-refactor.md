# Feature Spec: Root Homepage & Nav IA Refactor (Tier 2)

**Status:** Draft
**Tier:** 2 (Minor — routing + nav active-state fix)
**Date:** 2026-11-19
**Grounding:** Principle VII (Five Whys, Mermaid, trade-offs)

## 1. Problem & Context
- Nav shows `Dashboard | Ăn uống`; logo links to `/` which merely redirects to `/dashboard` — redundant destination.
- On `/foods`, the `Ăn uống` nav item is highlighted due to a special case, making users think they are still on "Hôm nay ăn gì".
- Owner asked why `/dashboard` is needed instead of `/`.

### Five Whys
1. Why is `Ăn uống` highlighted on `/foods`? `active` includes `pathname === "/foods"` for that link.
2. Why was that added? To make the food library feel connected to the food tab.
3. Why is it wrong? Two distinct pages show the same active state — ambiguous navigation.
4. Why does `/dashboard` exist? It was the original app root before routing was reorganised.
5. Why change now? Owner wants one clear home (`/`) and one link per destination.
Root cause: **legacy route + cross-page active override**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given `/`, When a signed-in user opens it, Then the dashboard UI renders directly (no redirect).
AC-2: Given `/dashboard`, When opened, Then it redirects to `/` (backward compatibility, no loop).
AC-3: Given the nav, When signed in, Then there is exactly one primary link: `Ăn uống` → `/what-to-eat`.
AC-4: Given `/foods`, When opened, Then no primary nav link is highlighted; the food-library link inside "Thêm" is highlighted.
AC-5: Given `/what-to-eat`, When opened, Then `Ăn uống` is highlighted.
AC-6: Given login/register, When successful, Then the app navigates to `/`.
AC-7: Given history "Đi đến Dashboard", When clicked, Then it goes to `/`.
AC-8: Given 375/1440, When nav renders, Then no layout leak and touch targets >= 44px.

## 3. UX 5-state map
| Route | Nav active |
|---|---|
| / | none (logo = home) |
| /what-to-eat | Ăn uống |
| /foods | Thêm > Thư viện món ăn |
| other | respective group item |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 44px touch base.

## 3c. Architecture & mental model
```mermaid
flowchart LR
  ROOT[app/page.tsx] --> SAME[dashboard component]
  LEGACY[/dashboard] --> REDIRECT[/]
  NAV[primary link] --> ONLY[Ăn uống]
  A[isNavActive pure helper] --> NAV
```
- Pure helper `isNavActive(pathname, href)` in `src/lib/nav-active.ts`, unit-tested TDD; removes the ad-hoc `/foods` override from Nav.
- Route change only; no API/schema change.

## 3d. Failure modes & resilience
- Old bookmarks to `/dashboard` still work via redirect.
- No redirect loop: `/` renders directly, never redirects.
- Smoke gate updated to assert on `/`.

## 3e. QA matrix & harness
| Area | Type | Command |
|---|---|---|
| Pure helper | unit (TDD) | `npm test -- tests/nav-active.test.ts` |
| Routes | curl | `/` 200 with name, `/dashboard` 307 -> `/` |
| Nav active | Playwright | 3 routes, assert active count |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 4. Contract (REST)
| Method | Path | Body | Response | Errors |
|---|---|---|---|---|
| GET | /api/auth/me | — | { user } | 401 |

No endpoint change.

## 5. Data Schema
No Prisma change.

## 6. Trade-offs & rejected alternatives
- Rejected: keep both `/` and `/dashboard` rendering the page -> duplicate canonical URLs.
- Rejected: move dashboard files to `src/app/(home)/` -> large diff with no user benefit.
- Rejected: keep Dashboard in nav as a second link -> owner explicitly asked to remove it.
- Chosen: root renders dashboard, legacy path redirects, one primary nav link.

## 7. Key engineering takeaways
- A home route should be canonical; redirects should point to it, not away from it.
- Active-state logic belongs in a pure helper so cross-page overrides are visible and testable.
- Removing a nav item requires updating every internal link that assumed it.

## 8. Security & performance
- Redirect is server-side via `redirect()`; no open-redirect input.
- 401 gates unchanged; no new request path.
- One extra 307 only for legacy `/dashboard` bookmarks.

## 9. Evidence
- Spec judge: 93/100
- TDD red->green: tests/nav-active.test.ts (3 tests) written first; isNavActive matches exact or nested paths without the /foods override; tests 41/41 PASS
- Root: / renders DashboardView directly (200); /dashboard legacy redirects 307 -> /; fixed a redirect loop caught in QC by splitting the view into DashboardView.tsx
- Nav: only "Ăn uống" primary link; login/register redirect to /; history CTA is a Link to /; smoke gate asserts on /
- Playwright: active nav count 0 on / and /foods, 1 on /what-to-eat; audit passed; verify-ui 4/4 viewports
- Lint required converting history <a href="/"> to next/link
- Build/typecheck/lint PASS; smoke 9/9; URL HTTP 200
