# Feature Spec: Secret Hygiene & Fail-Fast (Tier 3)

**Status:** Draft
**Tier:** 3 (Major — security hardening across runtime + deploy)
**Date:** 2026-11-20
**Grounding:** `app-security-hardening` skill (Invariant V: Zero Secrets in Code); OWASP ASVS V2/V6; WAHH Ch.9

**KB citations (retrieved this session):**
- OWASP Cheat Sheet Series — "Fail fast if the token is missing to avoid confusing 4xx errors." > Zero Trust Architecture Cheat Sheet > Technology Components — p.1 — supports fail-fast on missing secrets.
- CIS Kubernetes Benchmark v2.1.0 — 5.4 Secrets Management > Rationale — p.281 — "secrets can easily be exposed ... who has access to the logs" — supports keeping secrets out of code/compose.

## 1. Problem & Context
`gate audit` found HIGH SEC-01: `CRON_SECRET || "nutrition-tracker-cron"` in `/api/reminders/tick`. Investigation found more:
- `JWT_SECRET ?? "dev-secret-change-me..."` in `src/middleware.ts` and `src/lib/auth.ts`.
- `docker-compose.prod.yml` hardcodes JWT_SECRET placeholder, VAPID keys and CRON_SECRET (committed to git).
- `.env` has real values; container gets them only via `.env` interpolation? No — compose overrides with literals.
- `npm audit`: 3 high / 7 moderate (prisma, effect, typescript-eslint, minimatch).

### Five Whys
1. Why fallback secrets? Early dev convenience made it into production code.
2. Why hardcoded in compose? Deploy script needed values;owner pasted them inline.
3. Why does it matter? Anyone with repo read access has cron/JWT/VAPID secrets; fallback lets app boot insecurely.
4. Why not caught earlier? No secret scanner in pre-commit until gate audit upgrade.
5. Why fix now? Pre-commit blocks any commit until resolved.
Root cause: **no single secret-loading primitive; env wiring bypassed `.env`**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given `getSecret(name)`, When env var is missing, Then it throws with a clear message (fail-fast, no fallback).
AC-2: Given `JWT_SECRET` present, When auth/middleware load, Then they use it; no literal fallback string anywhere in `src/`.
AC-3: Given `CRON_SECRET` present, When tick route runs, Then it uses the env value; no hardcoded cron secret.
AC-4: Given compose, When read, Then all secrets come from `.env` interpolation (`${VAR}`), no inline values.
AC-5: Given `.env.example`, When read, Then all required keys are documented with placeholders.
AC-6: Given tests, When run, Then env is injected via Vitest config (no fallback needed).
AC-7: Given `npm audit`, When run, Then high/critical are resolved or documented (e.g. `npm audit fix` non-breaking).
AC-8: Given deploy, When run, Then app + scheduler still work with real secrets.

## 3. Architecture
```mermaid
flowchart LR
  ENV[.env (gitignored)] --> COMPOSE[compose ${VAR}]
  COMPOSE --> APP[app container]
  COMPOSE --> SCHED[scheduler container]
  APP --> GETSEC[getSecret(name) fail-fast]
  SCHED --> TICK[/api/reminders/tick]
  GETSEC --> T[unit test: throws on missing]
```
- Pure helper `src/lib/secret.ts` with `getSecret`, TDD tested.
- `vitest.config.ts` sets test env values (test-only, not code fallback).

## 4. Failure modes
- Missing env -> process throws at startup (intended fail-fast).
- Scheduler with no CRON_SECRET -> tick returns 401 for valid request? Actually it will fail-fast; compose must provide it.
- Rotating secrets -> update `.env` and redeploy; no code change.

### QA harness
| Area | Type | Command |
|---|---|---|
| Pure helper | unit (TDD) | `npm test -- tests/secret.test.ts` |
| Secret scan | gate | `gate audit` -> 0 HIGH security issues |
| Compose | grep | no inline secret values in compose |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 5. Contract (REST)
No endpoint change; 401 gate retained. Success/error shape unchanged.

## 6. Trade-offs & rejected alternatives
- Rejected: dev-only fallback via `NODE_ENV` check -> gate scanner still sees fallback string; weak.
- Rejected: keep compose literals -> secrets in git forever.
- Chosen: fail-fast helper + `.env` interpolation everywhere.

## 7. Key engineering takeaways
- Secrets must have exactly one source (env/vault); code and compose must not carry defaults.
- Fail-fast at startup is better than silent insecure boot.
- A secret scanner in pre-commit turns a one-time fix into a lasting invariant.

## 8. Security & performance
- Pure string lookup; negligible cost.
- No secret logged; errors name only the variable, not its value.

## 9. Evidence
- Spec judge: 95/100 with real KB citations (OWASP fail-fast chunk 52867324960cbc97268271d32aa93543; CIS Benchmark 5.4 Secrets Management p.281)
- TDD red->green: tests/secret.test.ts written first; getSecret throws with variable name when missing, returns value when present; tests 58/58 PASS
- Removed all 4 fallback secrets: JWT_SECRET (middleware + auth), CRON_SECRET (tick route + /api/auth/me); changed to lazy jwtSecret() so build-time does not require env while runtime still fails fast
- Compose: all secrets now ${VAR:?required} interpolation; scheduler uses environment + escaped $$CRON_SECRET in entrypoint (verified docker inspect shows literal $CRON_SECRET, not the value)
- Added CRON_SECRET to .env (gitignored) and .env.example; vitest.config.ts injects test-only secrets
- Dynamic import into module top-level caused Docker build failure; fixed by lazy getSecret at call time
- gate audit: SEC-01 resolved, Security & Hygiene audit PASSED; npm audit still reports 3 high / 7 moderate (pre-existing prisma/effect/typescript-eslint, non-blocking for gate)
- Build/typecheck/lint PASS; smoke 9/9; verify-ui 4/4; URL 200
