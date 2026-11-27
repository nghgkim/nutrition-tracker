# ADR 0002 - Request Boundary Validation Invariant

- **Status:** Accepted
- **Date:** 2026-11-26
- **Scope:** all `src/app/api/**/route.ts` handlers

## Context

Route handlers coerced client input with `Number(value)` and `new Date(value)`
directly. This admitted `NaN` and `Infinity` because `Number(x) < 0` and
`Number(x) <= 0` are both false for `NaN`. Date-only strings were parsed as UTC
midnight while records were created with local timestamps, producing off-by-one
day filtering in UTC+7. The finance summary also counted a user's own household
expenses twice because `myLogs` and `famLogs` overlapped.

## Grounding

- **Continuous Delivery - Configuration Management > Principles of Managing Application Configuration - p.82-83** (retrieved via `kb_retrieve_passages` this session): configuration should be "modular and encapsulated so that changes in one place don't have knock-on effects"; use DRY so each concept has one representation.
- **Building Microservices, 2E - DRY and the Perils of Code Reuse - p.180-181** (retrieved via `kb_retrieve_passages`): duplicated behaviour is easy to forget in every location, "which can lead to bugs". Validation logic duplicated across 13 routes is the same failure mode.

## Decision

1. `src/lib/request-validation.ts` is the only place that parses request
   input: `parsePositiveNumber`, `parseDay`, `normalizeMealType`, `monthBounds`,
   `localDayKey`.
2. Every route handler validates before touching Prisma and returns RFC 7807
   style `problemResponse(..., 400)` for invalid input. `Number()` is not used
   on request data in route handlers.
3. Date-only strings are parsed into local calendar days; month ranges use
   local bounds; history keys use `localDayKey`, never `toISOString()`.
4. `src/lib/finance-summary.ts` owns aggregation and deduplicates expenses by
   `id` so overlapping result sets cannot double-count.
5. Route-level tests call handlers directly and assert 400/201 responses with
   mocked session and Prisma boundaries.

## Rejected alternatives

- **Add `Number.isFinite` inline at each call site.** Rejected: thirteen routes
  would repeat the same guard and drift again (DRY violation above).
- **Use a Zod schema per endpoint.** Rejected for this patch: it adds a
  dependency and a second vocabulary alongside the existing helper types; the
  pure helpers are already covered by unit tests.
- **Normalise all dates to UTC.** Rejected: the product displays local calendar
  days; converting storage but not display would move the off-by-one rather
  than remove it.

## Consequences

- New endpoints must import the helpers instead of coercing input themselves.
- `mealType` accepts only `breakfast|lunch|dinner|snack`; the UI already uses
  exactly these values with Vietnamese labels.
- The behavioural auditor's V1 check is now clean for this repository.

## Verification

```bash
npm test -- --run tests/request-validation.test.ts tests/routes-validation.test.ts
npm run typecheck
```
