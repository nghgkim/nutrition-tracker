# Feature Spec: Refresh Token Rotation (Tier 3)

**Status:** Draft
**Tier:** 3 (Major — auth schema, middleware, cookies, client)
**Date:** 2026-11-27
**Grounding:** Cloud Native Data Security with OAuth — Ch.13 — p.327–328 (KB retrieved this session): rotate on every refresh, one-time use, revoke all on reuse.

## 1. Problem & Context
Access JWT expires after 7 days with no renewal path. An installed PWA on a phone is kicked to `/login` on refresh after that window even though the user still uses the app. No refresh token exists anywhere in repo history.

### Five Whys
1. Why kicked? `signToken` sets `exp = iat + 7d`; middleware rejects expired JWT.
2. Why no renewal? Initial MVP shipped stateless single JWT only; no session/token table and no spec requirement.
3. Why bad? Active users are forced to re-login, and there is no per-device revocation.
4. Why rotation? A plain long-lived token fixes expiry but cannot detect theft. Rotation issues a new refresh token each time and revokes the whole family on reuse — best practice per *Cloud Native Data Security with OAuth — Ch.13 — p.327–328*.
5. Why Tier 3? New DB model, migration, middleware branch, cookie contract and client retry.
Root cause: **no renewable session boundary between access token expiry and full re-login.**

## 2. Acceptance Criteria (Gherkin)
AC-1: Given login/register, When successful, Then response sets `nt_session` (access JWT) and `nt_refresh` (random 32-byte token) cookies; DB stores only SHA-256 hash of the refresh token.
AC-2: Given an expired access token and a valid refresh cookie, When a page navigation is attempted, Then middleware redirects through `/api/auth/refresh?next=...`, rotates both cookies and continues to the original page — no manual login.
AC-3: Given `/api/auth/refresh`, When called with a valid token, Then the old token is marked revoked atomically, a new token is issued, and only one concurrent rotation succeeds.
AC-4: Given a revoked refresh token presented again, When detected, Then all refresh tokens of that user are revoked and both cookies cleared (reuse detection).
AC-5: Given `/api/auth/refresh?next=//evil.com`, When handled, Then redirect goes to `/` (no open redirect).
AC-6: Given logout, When called, Then current refresh token is revoked and both cookies cleared.
AC-7: Given Nav's `/api/auth/me` returns 401 mid-session, When it does, Then client tries one refresh and retries before showing login.
AC-8: Given 390px PWA, When refresh handshake completes, Then app renders normally with 44px touch rows and no horizontal overflow.
AC-9: Given build/typecheck/lint/tests, When run, Then all pass; smoke, `verify-ui`, `gate audit` green; URL 200.

## 3. UX 5-state map
| State | Auth behavior |
|---|---|
| Empty | not applicable (auth cookies absent -> login) |
| Loading | refresh handshake redirects transparently; no new spinner required |
| Error | failed refresh clears cookies and lands on `/login` |
| Success | user resumes on requested page with fresh cookies |
| Partial | refresh cookie valid but access expired -> silent rotation |

## 3b. Design tokens
No new UI elements; existing `ErrorBanner`/toast tokens unchanged.

## 3b2. Mobile-first responsive strategy
No layout changes. Verification covers 375/390px in a mobile context: after simulated access-token expiry, navigation must complete the refresh handshake and render the same dashboard/layout with 44px touch targets, no horizontal scroll.

## 3c. Architecture
```mermaid
flowchart LR
  BROWSER[Phone PWA cookies] --> MW[Middleware: verify access JWT]
  MW -- expired --> RH[/api/auth/refresh?next=/]
  RH --> DB[(RefreshToken: hash, expiry, revokedAt)]
  RH -- rotate --> COOKIES[Set new access + refresh cookies]
  COOKIES --> BROWSER
  BROWSER --> NAV[Nav /api/auth/me 401 -> one refresh retry]
  RH -- reuse detected --> REVOKE[revoke all user tokens + clear cookies]
  REVOKE --> LOGIN[/login]
```
- `RefreshToken` model: `id`, `userId` (FK cascade), `tokenHash` unique, `createdAt`, `expiresAt`, `revokedAt?`, `lastUsedAt?`; index on `userId`.
- Rotation is atomic: `updateMany(... where id AND revokedAt=null)` must affect exactly 1 row; 0 means reuse -> revoke all for that user. This is the concurrency guard (no distributed lock needed).
- Refresh token lifetime 30 days; access JWT stays 7 days. Refresh cookie is `httpOnly`, `sameSite=lax`, `path=/api/auth`, `secure` opt-in via `COOKIE_SECURE=true` (off by default so the same image can be exercised over HTTP on localhost).
- Middleware only adds a redirect on JWT failure for page navigations when the refresh cookie exists; API paths keep the existing behavior. Failure path always lands on `/login` to avoid redirect loops.

### Verification harness
| Area | Type | Command |
|---|---|---|
| Pure helpers | unit (TDD) | `npm test -- tests/auth-refresh.test.ts` |
| Rotation/reuse | unit with mocked Prisma | `npm test -- tests/auth-refresh.test.ts` |
| Middleware handshake | Playwright | expire access cookie -> navigate -> still logged in |
| Reuse detection | API | replay old cookie -> all sessions revoked -> `/login` |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui + gate audit |

### Failure modes
- Concurrent rotation -> atomic claim ensures only one winner; loser triggers revocation.
- Missing/invalid refresh cookie -> clear cookies, redirect `/login`.
- Open redirect -> `safeNextPath` allowlists local paths starting with a single `/`.
- Migration on live DB -> additive table only, no data rewrite; rollback drops table.

## 4. Contract (REST)
| Method | Path | Request | Response |
|---|---|---|---|
| POST | /api/auth/refresh | refresh cookie | `{ok:true}` + new cookies |
| GET | /api/auth/refresh?next=/path | refresh cookie | 303 redirect to `next` or `/login` |
| POST | /api/auth/logout | cookies | clears both cookies, revokes token |

`nt_refresh` cookie: httpOnly, sameSite=lax, path=/api/auth, maxAge 30d, secure in production.

## 5. Data Schema
| Model | Field | Change |
|---|---|---|
| RefreshToken | id, userId, tokenHash, createdAt, expiresAt, revokedAt?, lastUsedAt? | new table |
| User | refreshTokens | new relation |

Migration `20261127100000_refresh_tokens`. Rollback: `DROP TABLE "RefreshToken";` (all users must re-login).

## 6. Trade-offs & rejected alternatives
- Rejected: extend access JWT to 30 days only -> fixes expiry but no revocation/theft detection.
- Rejected: store refresh token plaintext -> DB leak gives immediate account takeover; hash with SHA-256.
- Rejected: let middleware query Prisma -> Edge runtime has no DB client; use a route handshake.
- Rejected: refresh on every API 401 globally -> large client refactor; scope to page navigation + Nav auth check.
- Chosen: rotation with reuse detection per KB citation.

## 7. Takeaways
- Session renewal must be explicit; a long-lived access token is not a substitute.
- One-time refresh tokens with reuse detection turn theft into a detectable event.
- Middleware must stay DB-free; route-level handshake keeps the boundary clean.

## 8. Security & authorization
Refresh tokens are random 32-byte values, stored only as SHA-256 hashes, scoped to a user, expire in 30 days, and are revoked on logout and on reuse. Cookies are HttpOnly/SameSite=Lax with narrow path; Secure is available via COOKIE_SECURE for HTTPS-only deployments. `next` redirect is validated to local paths. Access JWT remains HS256 with fail-fast secret loader.

## 9. Performance SLA
Refresh adds one hash lookup + one atomic update + one insert per 7 days per device (< 5 ms). Middleware path unchanged for valid tokens.

## 10. Evidence
- Spec judge: 100/100 grounded in KB citation Cloud Native Data Security with OAuth — Ch.13 — p.327-328 (retrieved this session)
- TDD red->green: tests/auth-refresh.test.ts failed to load before helper, then 7/7 PASS (hash, entropy, safeNextPath, scoped cookie, atomic rotation, reuse revocation, unknown token); total 26 files / 119 tests
- Migration 20261127100000_refresh_tokens applied via prisma migrate deploy; RefreshToken table with unique tokenHash and userId index; no data rewrite
- Bug found in verification: refresh cookie path=/api/auth is invisible to middleware on page requests -> middleware now always attempts the handshake on invalid access, and the route validates the cookie; second bug: NextResponse.redirect used internal origin 0.0.0.0:3000 -> switched to relative Location header
- Production API verification: expired access + valid refresh -> GET / final 200 at /, /api/auth/me 200, refresh rotated; replay old refresh -> 401 with both cookies cleared and all 8 user tokens revoked; subsequent new token -> 401; logout -> 200, cookies cleared, refresh after logout -> 401
- Cookies: nt_refresh httpOnly/sameSite=lax/path=/api/auth/30d; Secure opt-in COOKIE_SECURE=true for HTTPS-only deployments (off so the same image remains testable over HTTP localhost)
- Nav retries /api/auth/me once after a failed refresh before showing login
- Build/typecheck/lint PASS; smoke 9/9; verify-ui 375/390 certified; gate audit 0 Critical/High; URL 200
