# Feature Spec: Journal Save Cleanup (Tier 1 Patch)

**Status:** Draft
**Tier:** 1 (Bugfix — dead state update)
**Date:** 2026-11-20
**Grounding:** Clean Code — no dead branches

## 1. Problem & Context
`save()` in `/journal` contained `setForm(f => ({ ...f, tags: f.tags.length ? [] : [] }))` — a conditional whose two branches are identical, clearing tags after every save. The effect already rehydrates the form from `entries` after `load()`, so the line is dead and misleading.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given a saved journal entry with tags, When save completes, Then tags remain displayed (rehydrated from the server response).
AC-2: Given the source, When read, Then no tautological conditional remains.
AC-3: Given build/tests, When run, Then all pass.

## 3. Architecture & mental model
```mermaid
flowchart LR
  SAVE[save() PUT] --> LOAD[load() GET entries]
  LOAD --> EFFECT[useEffect(selected, entries)]
  EFFECT --> FORM[form state incl. tags]
  X[removed dead setForm] -.-> FORM
```
Pure UI cleanup; no API/schema change. Concurrency: none — the existing effect is the single source of truth for form state after load.

### Verification harness & QA matrix
| Area | Type | Command |
|---|---|---|
| Source | grep | no tautological `tags.length ? [] : []` |
| UI | Playwright | save entry with tags, assert tags still visible |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

### Performance SLA / infrastructure
No new request, no profile change; save still performs one PUT + one GET (<100 ms p95 on local).

## 4. Failure modes & resilience
- If GET fails after save, the effect keeps the last form state (tags remain visible from the local form) — no crash.
- If PUT fails, error toast is shown and no state update occurs.

## 5. Contract / Schema
No change.

## 6. Trade-offs
Rejected: leave dead branch -> code smell and confusing intent. Chosen: remove it.

## 7. Takeaways
A conditional with identical branches is always a bug or dead code — delete it.

## 8. Security
No change.

## 9. Evidence
(TBD after QC)
