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
- Silencing compiler warnings, linter diagnostics, or type checkers using inline suppression flags (`eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `# noqa`, `# type: ignore`, `//nolint`, `#[allow(...)]`) is strictly prohibited.
- Every compiler and linter warning is treated as a latent production bug. Fix the root cause in the code or adjust project-level configuration in `eslint.config.mjs` / `pyproject.toml` / `Cargo.toml` with documented architectural rationale.
- The Git pre-commit hook mechanically enforces `gate hygiene`. Any commit containing inline suppression comments is rejected immediately with exit 1.

### Principle VII: Human Mastery, Pedagogical Transparency & Anti-Blackbox Delivery
- Extreme automation MUST NOT create an "AI Knowledge Silo" that leaves human engineers blind to system mechanics or excluded from the learning loop.
- Every architectural deliverable, non-trivial refactor, or complex feature specification MUST articulate:
  1. **Mental Model & Data Flow**: A visual diagram (Mermaid) and first-principles mechanism explanation.
  2. **Rejected Alternatives & Trade-offs**: At least two alternative designs evaluated and rejected, detailing trade-offs (memory, CPU, latency, operational complexity).
  3. **Key Engineering Takeaways**: Generalizable lessons to build engineer mastery.
- Every defect fix MUST include a **Five Whys** root-cause breakdown to convert isolated bugs into lasting conceptual mental models.
- AI agents MUST act as Staff Mentors during delivery: explaining under-the-hood physics, surfacing gotchas, and seeking human alignment at key decision gates instead of executing silent black-box rewrites.

### Principle VIII: Mobile-First Responsive Design & Touch Ergonomics
- Every user-facing interface, component, and user journey MUST be designed, coded, and mechanically verified **Mobile-First** (375px/390px viewports) before scaling upward to tablet (768px) and desktop (1440px).
- **Core Mobile Invariants:**
  1. **Zero Horizontal Leak:** On mobile viewports (375px/390px), `scrollWidth <= clientWidth` is strictly enforced. Any horizontal page spill or horizontal scrollbar is a fatal QC violation.
  2. **Touch Target Sizing:** Primary interactive elements (buttons, inputs, select triggers, navigation controls) MUST provide a minimum touch target bounding box of **44x44px** (Apple HIG & WCAG SC 2.5.5) or minimum 40px height with adequate spacing.
  3. **Mobile Ergonomics (Thumb Zone):** Primary actions and navigation triggers must reside within the natural reach of the user's thumb (lower screen boundary).
  4. **Progressive Enhancement:** Base CSS rules must represent the mobile experience. Media queries and breakpoint prefixes (`sm:`, `md:`, `lg:`) are permitted ONLY to scale upward. Desktop-down degradation (`max-md:`, `max-lg:`) is strictly forbidden.
  5. **Viewport Declaration:** HTML documents MUST include `<meta name="viewport" content="width=device-width, initial-scale=1.0">`. Text inputs must maintain minimum 16px font size on mobile to prevent automated iOS viewport zooming.

---

## Governance & Compliance

1. This constitution supersedes any ad-hoc preferences or prompt-only instructions.
2. Changes to this constitution require explicit peer review and documentation in `docs/decisions/`.
3. Automated tools (`gate`, pre-commit hooks, CI/CD runners) are authorized to reject any pull request violating these invariants.
