# Project Constitution

**Version**: 1.0.0 | **Enforcement**: Strict Mechanical Quality Gates

---

## Core Engineering Invariants

### Principle I: Zero Root Pollution
- Project files, source code, dependencies, and temporary scripts MUST strictly live within repository boundaries under `~/Code/Personal/`, `~/Code/YNM/`, or `~/Code/Aspirely/`.
- NEVER pollute `/home/ubuntu`, `~`, or system directories with transient artifacts.

### Principle II: No SDD, No Code
- Writing production code before completing an approved Specification, Implementation Plan, and Task Checklist is strictly prohibited.
- Specifications must score at least 90/100 on `gate judge` before Phase 2 implementation can start.
- Every commit is mechanically verified by a `.git/hooks/pre-commit` hook running `gate audit` and `gate check`.

### Principle III: Mechanical QC over AI Self-Report
- AI agent statements ("the build passes", "all tests are green") are treated as UNVERIFIED until verified by deterministic automated tooling.
- Concurrency and boundary safety MUST be proven via `scripts/qc-stress.py` (15 parallel threads, 7 dirty fuzzing payloads).
- Frontend UI must pass automated anti-whiteout and CSS audit (`scripts/verify-ui.py`).
- Crawlers and browser automations must leave ZERO zombie processes (`pgrep -f "chrome.*--headless"` == 0).

### Principle IV: 3-Cycle Circuit Breaker & Auto-Rollback
- If a bugfix or test cycle fails more than 3 consecutive times, execution MUST immediately halt.
- Dirty changes are automatically stashed via `git stash save "circuit-breaker-auto-stash-..."`.
- The agent or developer must document the blocking hypothesis and escalate rather than cycling blindly.

### Principle V: Daily Invariant Buffer & Postmortem Loop
- Every defect, flaky test, or regression encountered must be recorded in `docs/daily/DAILY.md` with an automated invariant to prevent recurrence.
- Major production incidents require a blameless postmortem published via `gate postmortem publish`.

### Principle VI: Zero Suppression & Transparent Diagnostics (Never Hide Bugs)
- Silencing compiler warnings, linter diagnostics, or type checkers using inline suppression flags (ESLint disable directives, TypeScript ignore directives, Python noqa/type-ignore comments, Go nolint directives, Rust allow attributes) is strictly prohibited.
- Every compiler and linter warning is treated as a latent production bug. Fix the root cause in the code or adjust project-level configuration in `eslint.config.mjs` / `pyproject.toml` / `Cargo.toml` with documented architectural rationale.
- The Git pre-commit hook mechanically enforces `gate hygiene`. Any commit containing inline suppression comments is rejected immediately with exit 1.

---

## Governance & Compliance

1. This constitution supersedes any ad-hoc preferences or prompt-only instructions.
2. Changes to this constitution require explicit peer review and documentation in `docs/decisions/`.
3. Automated tools (`gate`, pre-commit hooks, CI/CD runners) are authorized to reject any pull request violating these invariants.
