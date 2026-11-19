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

### Principle IX: Zero-Trust Security, Least Privilege & Secure by Default
- Applications, APIs, and infrastructure MUST operate under the **Zero-Trust Security Model** grounded in OWASP and WAHH:
  1. **Server-Side Authorization (No Client Trust):** Every request accessing or mutating data MUST be authorized server-side against the authenticated session and tenant ID. Client-side role checks are strictly for UI presentation; never trust user-supplied `user_id` or `tenant_id` from request bodies (prevent IDOR/BOLA).
  2. **Parameterized Queries Only (Zero SQLi):** All database operations MUST use prepared statements or parameterized ORM queries. Raw string interpolation or format strings (`f"SELECT..."`, `$queryRawUnsafe`) with dynamic inputs are strictly prohibited.
  3. **Zero Secret Fallback:** Default fallback secrets (e.g. `process.env.JWT_SECRET || "default_dev_secret"`) in production code are strictly forbidden. The application MUST fail-fast on startup if any required environment secret is undefined.
  4. **Cryptographic & Token Hygiene:** Passwords MUST be hashed using Argon2id, scrypt, or bcrypt ($work \ge 10$). Plain MD5 or SHA1 is strictly forbidden. JWT tokens MUST enforce signature verification with an explicit algorithm whitelist (never accept `alg: none`).
  5. **Abuse Defense & Rate Limiting:** All unauthenticated public endpoints (login, registration, password reset, token issuance) and resource-intensive endpoints MUST enforce rate limiting to prevent brute-force attacks and denial-of-service.
  6. **Context-Aware Output Encoding & Sanitization:** All untrusted user content rendered into the DOM MUST be encoded for the destination context or sanitized via DOMPurify to eliminate Stored and Reflected XSS.

### Principle X: Production Infrastructure, Container Hardening & Resilient Lifecycle
- Infrastructure, deployment manifests, and container runtimes MUST comply with **CIS Docker & Kubernetes Benchmarks** and **Systems Performance (TLPI)** lifecycle invariants:
  1. **Non-Root Execution (Least Privilege):** Containers must NEVER run as root. A dedicated non-root user (`USER nonroot` or UID $\ge 10000$) is mandatory in production container stages.
  2. **Immutable Base Pinning:** Base images and workload containers must be pinned to explicit semantic version tags or immutable SHA256 digests. Tag `:latest` is strictly prohibited.
  3. **Workload Resource Isolation (QoS):** Kubernetes manifests must specify both `resources.requests` and `resources.limits` for CPU and Memory to prevent noisy-neighbor node exhaustion and cascading OOMKills.
  4. **Probe Decoupling:** Liveness probes MUST check only local runtime responsiveness/deadlocks; never call external databases or upstream dependencies in liveness probes. Readiness probes MUST gate traffic based on internal warm-up and dependency health.
  5. **Graceful Drain (Zero Dropped In-Flight Requests):** Applications must trap `SIGTERM`, cease accepting new connections, drain in-flight requests, flush buffers, and close database connection pools gracefully before exit. `terminationGracePeriodSeconds: 0` is strictly prohibited.

### Principle XI: Performance Budgets, Load Stressing & Empirical Optimization
- Systems performance is an empirical discipline grounded in **Google SRE** and **Systems Performance (Brendan Gregg)**:
  1. **Strict Latency Percentile SLAs:** Services must adhere to percentile SLAs, never bare averages:
     - Median ($p50$) $\le 50\text{ms}$ for standard CRUD read paths.
     - $p95 \le 200\text{ms}$ under expected peak load.
     - $p99 \le 500\text{ms}$ under stress load.
     - Error rate under concurrent load MUST remain $\le 0.1\%$ ($99.9\%$ success rate).
  2. **Mechanical Stress & Concurrency Verification:** High-throughput endpoints and workers must be verified under concurrent load using `gate perf` or dedicated k6 scripts (`tests/load/`).
  3. **Event Loop Non-Blocking (Zero Starvation):** Asynchronous runtimes (Node.js, Tokio, Python asyncio) must never execute synchronous blocking I/O or sleep calls on worker threads; CPU-intensive tasks must offload to dedicated blocking worker pools.
  4. **Database & Query Hygiene:** Hot read paths must be backed by composite indexes (Equality first, Range second). Unbounded N+1 queries in ORM fetch loops are strictly prohibited.
  5. **Memory Soak Stability:** Resident Set Size (RSS) memory must stabilize under continuous soak load. Monotonically increasing RSS indicates memory leaks and triggers a QC rejection.

---

## Governance & Compliance

1. This constitution supersedes any ad-hoc preferences or prompt-only instructions.
2. Changes to this constitution require explicit peer review and documentation in `docs/decisions/`.
3. Automated tools (`gate`, pre-commit hooks, CI/CD runners) are authorized to reject any pull request violating these invariants.
