# ADR 0001 - Canonical Specification and Scope Boundaries

- **Status:** Accepted
- **Date:** 2026-11-26
- **Scope:** `docs/specs/nutrition-tracker.md` and all feature specs in this repository

## Context

The original feature spec `docs/specs/nutrition-tracker.md` was left at
`Status: Draft` and declared weight tracking, exercise, sharing and finance as
out-of-scope. The implemented application contains all of those features, plus
restaurants, journal, reminders and budget alerts. Sixty-six feature specs were
added one at a time, each valid for its own change but never reconciled with the
root spec. The result was a Draft document that contradicted production code and
no ratified record of the domain boundaries.

## Grounding

- **Domain-Driven Design - Chapter Two > Ubiquitous Language - p.13-14** (retrieved via `kb_retrieve_passages` this session): "Use the model as the backbone of a language. Commit the team to exercising that language relentlessly in all communication within the team and in the code"; "Recognize that a change in the UBIQUITOUS LANGUAGE is a change to the model."
- **Domain-Driven Design - Chapter Fourteen > Bounded Context - p.208** (retrieved via `kb_retrieve_passages`): "Explicitly define the context within which a model applies... Keep the model strictly consistent within these bounds, but don't be distracted or confused by issues outside."
- **Building Microservices, 2E - Bounded Context - p.82** (retrieved via `kb_retrieve_passages`): bounded contexts hide implementation detail and contain aggregates whose meaning is local to the context.

A single unbounded Draft spec cannot define a language that sixty-six later
documents keep extending. Explicit boundaries are required.

## Decision

1. `docs/specs/nutrition-tracker.md` is the canonical specification and is
   marked `Accepted`. It describes the ubiquitous language and the current
   in-scope capabilities; its former out-of-scope list is superseded.
2. The system is organised into bounded contexts, each with its own feature
   specs: **nutrition** (foods, logs, goals, what-to-eat), **activity**
   (exercise, training, weight), **finance** (budget, expense, household fund),
   **social** (family, sharing, invitations), and **insights** (journal,
   correlation, reminders). Terms such as `FoodLog`, `Goal`, `Expense` and
   `JournalEntry` keep one meaning inside their context.
3. The sixty-six feature specs remain as the change history for each context.
   New work references the canonical spec plus an ADR when it crosses a
   context boundary; it does not create a competing root document.
4. ADR 0002 records the request-boundary validation invariant and ADR 0003
   records the UI evidence contract.

## Rejected alternatives

- **Delete the feature specs and rewrite one large document.** Rejected: it
  discards traceability from Gherkin ACs to implemented changes and produces a
  document too large to review.
- **Leave the root spec as Draft to signal ongoing work.** Rejected: a Draft
  spec allows contradictions between spec and code to persist indefinitely.
- **Treat every feature as its own bounded context.** Rejected: that inflates
  the number of contexts and loses the shared vocabulary inside nutrition and
  activity; the groupings above follow the existing domain models.

## Consequences

- `docs/specs/nutrition-tracker.md` must be updated when a capability is added
  or removed, not only when a bug is fixed.
- Feature specs remain Draft as historical records; the canonical spec and
  these ADRs are the ratified state.
- The repository now has an ADR log, satisfying the S1 invariant.

## Verification

```bash
grep -n '^\*\*Status:\*\*' docs/specs/nutrition-tracker.md
ls docs/decisions/
```
