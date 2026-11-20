# Feature Spec: Service Worker Cache & Brand Refresh (Tier 2)

**Status:** Draft
**Tier:** 2 (Minor — static SW + tests)
**Date:** 2026-11-20
**Grounding:** Principle VII (Five Whys, Mermaid, trade-offs)

## 1. Problem & Context (Five Whys)
`public/sw.js` still uses `nutritrack-v3`, pushes default title "Nutrition Tracker", tag `nutritrack-reminder`, and opens `/dashboard` on notification click (now a legacy redirect to `/`).

1. Why stale? SW was written before the rebrand and root routing change.
2. Why does it matter? Old PWA clients keep cached shell and show the wrong brand in notifications.
3. Why not just edit silently? Cache name must change or `activate` won't purge the old cache.
4. Why `/dashboard` wrong? Homepage is now `/`; `/dashboard` is a 307 redirect.
5. Why fix now? Owner asked to continue; this is the last known stale artifact.
Root cause: **SW not included in the rebrand/routing checklist**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given `sw.js`, When read, Then `CACHE_NAME` starts with `thuypn-` and is not `nutritrack-v3`.
AC-2: Given the file, When read, Then no "Nutrition Tracker" string remains.
AC-3: Given push default, When read, Then title is "thuypn by kimnh" and tag prefix is `thuypn-`.
AC-4: Given notification click, When handled, Then it opens `/` (canonical home).
AC-5: Given client with old cache, When new SW activates, Then old caches are deleted (existing activate logic retained).
AC-6: Given HTML navigations, When fetched, Then network-first behaviour retained.

## 3. Architecture
```mermaid
flowchart LR
  DEPLOY[new sw.js v4] --> INSTALL[install: cache open]
  INSTALL --> ACTIVATE[activate: delete old caches]
  ACTIVATE --> CLIENT[clients.claim]
  PUSH[push event] --> TITLE[thuypn by kimnh]
  CLICK[notification click] --> HOME[/]
```
- Static file only; tests read the file as text and assert invariants (no runtime needed).

## 4. Failure modes
- If cache name unchanged, old clients keep stale shell -> AC-1 guards.
- If HTML cache-first returned, deploys invisible -> AC-6 guards.

### QA harness
| Area | Type | Command |
|---|---|---|
| SW invariants | unit (TDD) | `npm test -- tests/sw.test.ts` |
| Runtime | Playwright | register SW, check cache keys contain thuypn-v4 |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 5. Contract / Schema
No endpoint or schema change.

## 6. Trade-offs & rejected alternatives
- Rejected: keep cache name and rely on network-first only -> static assets still cached under old name.
- Rejected: delete SW entirely -> loses offline/PWA notifications.
- Chosen: bump cache name + fix brand strings + canonical route.

## 7. Takeaways
- A cache name is part of the deploy contract; brand/route changes must bump it.
- Static files can be regression-tested by reading them as text in Vitest.

## 8. Security & performance
No new request path; network-first HTML retained; 401 gate untouched.

## 9. Evidence
- Spec judge: 93/100
- TDD red->green: tests/sw.test.ts reads public/sw.js as text; 3 of 4 assertions failed on the stale file (cache name, brand string, notification route); tests 52/52 PASS
- SW updated: CACHE_NAME thuypn-v4, push title "thuypn by kimnh", tag prefix thuypn-, notification click opens "/" instead of /dashboard; activate still deletes old caches, HTML still network-first
- Browser verification: browser cache keys == ['thuypn-v4'], service worker controls the page, no stale cache remains
- Build/typecheck/lint PASS; smoke 9/9; verify-ui 4/4; URL 200
