# Engineering Conventions & Standards

> **Status:** Canonical & Ratified
> **Scope:** Universal across all repositories on this machine.
> **Enforcement:** Enforced mechanically via `.git/hooks/pre-commit`, `gate audit`, and `gate judge`.

---

## 1. Git & Branching Conventions

All feature and bugfix branches MUST adhere to the `<type>/<kebab-case-slug>` format:

| Branch Pattern | Workflow Stage | SDLC Tier | Description |
|----------------|----------------|-----------|-------------|
| `feat/<slug>` | Feature Pipeline | Tier 2 (Minor) | New functional capabilities or extensions |
| `fix/<slug>` | Fast-Track Pipeline | Tier 1 (Patch) | Bugfixes, regressions, security patches (bypasses PRD ceremony) |
| `spike/<slug>` | Technical Spike | Tier 0 (PoC) | Time-boxed exploration, benchmark, or prototype |
| `refactor/<slug>` | Structural Change | Tier 1/2 | Code restructuring without altering external behavior |
| `chore/<slug>` | Maintenance | Tier 1 (Patch) | Dependency updates, tooling, CI/CD changes |
| `docs/<slug>` | Documentation | Tier 1 (Patch) | Pure documentation updates |

**Rules:**
- Use lowercase alphanumeric characters and hyphens only (e.g. `feat/order-payment`, `fix/chrome-zombie-leak`).
- Branch from `main` (or `develop`), rebase or squash-and-merge via Pull Request.
- Never commit directly to `main` without passing the pre-commit hook.

---

## 2. Commit Message Conventions (Conventional Commits)

Commit messages MUST follow the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <imperative subject>

[optional body describing why and invariant changes]

[optional footer: Closes #123, Refs specs/... ]
```

### 2.1 Types
- `feat`: A new feature for the user or system.
- `fix`: A bug fix or regression remediation.
- `test`: Adding missing tests or correcting existing tests (TDD Red/Green).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `perf`: A code change that improves performance or reduces memory RSS.
- `docs`: Documentation only changes.
- `ci`: Changes to CI/CD configuration files and scripts.
- `chore`: Routine tasks, dependency bumps, toolchain adjustments.

### 2.2 Rules & Formatting
- **Language**: 100% technical English only — zero Vietnamese sentences or grammar.
- **Subject line**: Imperative mood ("add", "fix", "implement", NOT "added", "fixes", "implementing").
- **Length**: Maximum 72 characters for the subject line; no trailing period.
- **Examples**:
  - `feat(auth): implement JWT refresh token rotation with Redis blacklist`
  - `fix(crawler): add process reaper to kill orphan headless chrome instances`
  - `test(payment): add concurrency stress test for optimistic lock race`

---

## 3. Directory & File Organization Standards

Every repository follows the standardized governance layout:

```text
.
├── .github/workflows/          # CI/CD pipelines (gate-pipeline.yml)
├── docs/
│   ├── constitution.md         # Core project principles & invariants
│   ├── ARCHITECTURE.md         # Data flow, boundaries, component diagrams
│   ├── SCHEMA.md               # DB schemas, indexes, ESR rules
│   ├── LOCAL_DEV.md            # Local setup, environment, seed data
│   ├── CONVENTIONS.md          # This conventions document
│   ├── decisions/              # Architecture Decision Records
│   │   └── ADR-NNN-<slug>.md   # e.g., ADR-001-transactional-outbox.md
│   ├── daily/
│   │   ├── DAILY.md            # Active Working Buffer (3–5 days)
│   │   └── archive/YYYY-MM.md  # Weekly archived history
│   ├── evidence/<feature>/     # Test execution outputs, qa-defects.json
│   ├── postmortems/            # Blameless postmortems
│   │   └── YYYY-MM-DD-<slug>.md
│   └── specs/                  # Feature specifications
│       └── <feature-slug>/     # Native 3-Artifact SDD Decomposition
│           ├── spec.md         # What & Why (Scenarios, Gherkin ACs, Schema)
│           ├── plan.md         # How (Architecture, Concurrency, Migrations)
│           └── tasks.md        # Actionable breakdown (TDD Red->Green, [P])
├── scripts/
│   ├── smoke.sh                # Host smoke test
│   ├── verify-ui.py            # Modular visual & subresource audit
│   ├── qc-stress.py            # Concurrency stress & fuzzing harness
│   └── ui-checks/              # Specialized UI checks (layout, states, etc.)
├── src/                        # Production application code (or app/, lib/)
│   ├── transport/              # API routes, controllers, CLI entrypoints
│   ├── domain/                 # Pure business logic, models, state machines
│   └── persistence/            # DB repositories, migrations, external clients
└── tests/                      # Automated test suite
    ├── unit/                   # Fast, deterministic, zero-IO unit tests
    ├── integration/            # Real database/API integration tests
    └── stress/                 # Concurrency & boundary race tests
```

---

## 4. Spec-Driven Development (SDD) Identifier Conventions

To enable deterministic 1-to-1 traceability across BA $\rightarrow$ DEV $\rightarrow$ QC, use standardized identifiers:

| Identifier | Pattern | Example | Purpose |
|------------|---------|---------|---------|
| **Functional Req** | `FR-NNN` | `FR-001` | Core business capability |
| **Non-Functional Req** | `NFR-NNN` | `NFR-001` | Latency, throughput, security bounds |
| **User Story** | `US# (P#)` | `US1 (P1)` | Prioritized user journey (`P1` MVP, `P2` Ext, `P3` Polish) |
| **Acceptance Criteria** | `AC-NN` | `AC-01` | Numbered Given/When/Then Gherkin scenario |
| **Task** | `TNNN [P?] [US#]` | `T008 [P] [US1]` | Actionable task (`[P]` = parallelizable) |
| **Edge Case** | `E-NN` | `E-01` | Boundary, concurrency collision, timeout |
| **Success Criteria** | `SC-NNN` | `SC-001` | Measurable production metric |
| **Decision** | `ADR-NNN` | `ADR-001` | Architecture Decision Record |
| **QA Defect** | `DEF-NNN` | `DEF-001` | Defect tracked in `qa-defects.json` |

---

## 5. API Contract & Error Conventions

### 5.1 Endpoints & Payloads
- **Resource naming**: Nouns, plural, kebab-case (e.g. `/api/v1/nutrition-logs`, `/api/v1/crawl-jobs`).
- **HTTP Methods**:
  - `GET`: Idempotent read; zero side-effects.
  - `POST`: Create resource or execute non-idempotent action.
  - `PUT`: Full resource replacement.
  - `PATCH`: Partial resource update.
  - `DELETE`: Idempotent resource removal.
- **Idempotency**: All mutating operations (`POST`, `PUT`, `PATCH`) SHOULD support the `Idempotency-Key: <uuid-v4>` header.

### 5.2 Error Response Format (Strict RFC 7807)
All 4xx and 5xx responses MUST adhere to RFC 7807 Problem Details:

```json
{
  "type": "https://errors.example.com/item-not-found",
  "title": "Item Not Found",
  "status": 404,
  "detail": "Nutrition entry with ID 9a2b8e does not exist for tenant.",
  "instance": "/api/v1/nutrition-logs/9a2b8e"
}
```

---

## 6. Frontend Mobile-First & 5-State UI Conventions

### 6.1 Mobile-First Responsive Architecture (Strict Invariant)
Every frontend screen, layout, and component MUST be authored **Mobile-First**:
- **Base Classes = Mobile First**: Default CSS/Tailwind classes apply to the mobile viewport ($320\text{px} - 390\text{px}$) without prefixes (e.g. `flex flex-col gap-3 p-4 w-full`).
- **Progressive Breakpoints**: Breakpoint prefixes (`sm:`, `md:`, `lg:`, `xl:`) are reserved strictly for scaling upward to tablets and desktops (e.g. `md:flex-row md:p-6`).
- **FORBIDDEN (Desktop-First Degradation)**: Never author desktop styles as default and override downward with `max-md:` or desktop-first media queries.
- **Data Tables on Mobile**: Desktop data tables must NEVER overflow horizontally offscreen. On mobile, tables MUST either:
  1. Transform to responsive stacked cards (`flex flex-col md:table`), or
  2. Be wrapped in an isolated horizontal scroll container with visual scroll gradient fades (`overflow-x-auto`).
- **Touch Ergonomics & Thumb Zone**:
  - Interactive elements (buttons, inputs, select triggers) MUST have a minimum touch target bounding box of **$44 \times 44\text{px}$** (Apple HIG & WCAG 2.5.5).
  - Primary call-to-action buttons on mobile should anchor to the bottom "Thumb Zone" for single-handed usability.
- **Viewport & Text Scale**:
  - HTML must declare `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
  - Form input font-size must be $\ge 16\text{px}$ on mobile (`text-base md:text-sm`) to prevent iOS Safari auto-zoom on focus.

### 6.2 5-State UI Completeness
Every frontend view, component, or screen MUST explicitly implement and test all 5 states:

```text
[Empty State]    <-- Non-empty illustration, friendly explanation, CTA button (e.g. "Add Food")
[Loading State]  <-- Skeleton UI exactly matching final DOM layout dimensions (anti-jump)
[Success State]  <-- Rendered component with proper padding, accessible contrast (WCAG AA)
[Error State]    <-- Banner or toast with clear human-readable message and 'Retry' button
[Degraded State] <-- Stale-while-revalidate cached content or offline network indicator banner
```

---

## 7. Project Archetype Hard Invariants

Every project belongs to one primary archetype with mandatory mechanical rules:

| Archetype | Verification Invariant | Failure Mode To Prevent |
|-----------|------------------------|-------------------------|
| **`crawler`** | `pgrep -f "chrome.*--headless"` == 0 | Server OOM due to zombie browser leaks |
| **`backend`** | Migration `up -> down -> up` tested; `lock_timeout <= 2s` | Unrecoverable schema migration or DB deadlocks |
| **`worker`** | Idempotency Key deduplication; DLQ on poison pills | Duplicate message processing / infinite retry loops |
| **`frontend`** | `verify-ui.py` passes; anti-whiteout; 100vh constraint | White screen on load; vertical layout breaking |
| **`cli`** | Exit codes (0=pass, 1=runtime err, 2=usage err); clean stdout | Pipeline tools crashing without exit code protocol |

---

## 8. Defect-to-Invariant Loop (`docs/daily/DAILY.md`)

When any defect, test failure, or production bug occurs:
1. Document the symptom and root cause (5 Whys) in `docs/daily/DAILY.md`.
2. Write a deterministic test case that reproduces the defect in RED status.
3. Fix the code to turn the test GREEN.
4. Record the new test name as a permanent **CI Test Invariant** in `DAILY.md`.

---

## 9. Zero Linter & Type Suppression Invariant (Anti-Hiding)

Never hide defects or sweep compiler/linter warnings under the rug. Prohibited in production source code:

| Ecosystem | Prohibited Suppression Syntax | Resolution Rule |
|-----------|-------------------------------|-----------------|
| **TypeScript / JS** | `eslint-disable`, `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` | Fix root cause in code or configure project policy in `eslint.config.mjs` |
| **Python** | `# noqa`, `# type: ignore`, `# pylint: disable`, `# ruff: noqa` | Fix types / syntax or configure `pyproject.toml` |
| **Go** | `//nolint`, `//nolint:...` | Refactor struct/types or configure `.golangci.yml` |
| **Rust** | `#[allow(unused)]`, `#[allow(dead_code)]`, `#[allow(warnings)]` | Remove dead code or resolve compiler diagnostic |

**Enforcement:** Pre-commit hook runs `gate hygiene` on every commit. Any prohibited suppression tag blocks the commit immediately.

---

## 10. Pedagogical & Transparency Invariants (Anti-Blackbox)

Every engineering artifact produced by agents or contributors must be designed for human comprehension, situational awareness, and learning:

### 10.1 Specifications & Design Documents (`docs/specs/*.md`)
- **Mental Model & Data Flow**: Must include a visual Mermaid diagram showing component relationships and dataflow from boundary to persistence.
- **Trade-offs & Rejected Alternatives**: Must document at least 2 alternative architectures or libraries evaluated and rejected, detailing technical trade-offs (memory RSS, latency, cognitive load, lock contention).
- **Key Engineering Takeaways**: Must document generalizable mental models that engineers can take to other projects.

### 10.2 Bugfixes & Micro-RCAs (`gate fix`)
- Must document the **Five Whys** root-cause breakdown in `docs/evidence/<bug-name>/micro-rca.md`:
  1. *Why 1 (Symptom)*: What user-observable failure occurred?
  2. *Why 2 (Direct Cause)*: What state or variable triggered the failure?
  3. *Why 3 (Code Flaw)*: What code logic permitted the invalid state?
  4. *Why 4 (Test Gap)*: Why did existing CI tests fail to catch this earlier?
  5. *Why 5 (Root Invariant)*: What architectural principle was violated?

### 10.3 Interactive Mentorship Checkpoint
- Before implementing complex state changes or migrations, the agent must present the core mental model and key trade-offs, seeking human alignment at decision gates.
- Developers can inspect any file or concept under the hood at any time using:
  ```bash
  gate explain <file-path>       # Deep walkthrough: purpose, mechanics, gotchas, book grounding
  gate explain "<concept-name>"   # First-principles mental model tutorial
  ```

---

## 11. Zero-Trust Security & Defensive Engineering Standards

Every line of code and endpoint contract MUST adhere to OWASP Top 10 defense invariants:

### 11.1 Server-Side Authorization & Tenant Isolation (Anti-IDOR/BOLA)
- Client-side role checks are strictly for UI rendering. Every mutating or read operation MUST enforce authorization on the backend against the authenticated user and tenant scope.
- **FORBIDDEN:** `SELECT ... WHERE id = req.body.id` without `tenant_id = session.tenant_id`.
- **Enforcement:** Enforce ownership checks at the repository/service layer before executing queries.

### 11.2 Parameterized Queries Only (Zero SQLi)
- All database queries MUST use prepared statements or ORM parameterization:
  - TypeScript/Prisma: Use Prisma Client methods or `Prisma.sql` tagged template literals (which parameterize under the hood). Never use `$queryRawUnsafe` with string templates.
  - Python: Use SQLAlchemy prepared queries or psycopg2 `%s` parameterized tuples. Never use Python f-strings in queries (`f"SELECT ... {input}"`).
  - Go: Use `db.Query("SELECT ... WHERE id = ?", id)`. Never format with `fmt.Sprintf`.

### 11.3 Secret Management & Fail-Fast Startup (Zero Fallback Secrets)
- Hardcoding API keys, passwords, or private keys in source code is strictly prohibited.
- **FORBIDDEN:** `const secret = process.env.JWT_SECRET || "default_dev_secret"`.
- If a required secret or configuration variable is missing, the application MUST crash immediately on boot with an explicit diagnostic message.

### 11.4 Cryptographic Hygiene & Token Security
- Password hashing: Use **Argon2id** (memory $\ge 64\text{MB}$, iterations $\ge 3$) or **bcrypt** ($work \ge 10$). MD5 and SHA1 are prohibited.
- Session Cookies: MUST include `HttpOnly`, `Secure`, and `SameSite=Lax` or `Strict`.
- JWT Tokens: Access tokens MUST expire in $\le 15$ minutes. JWT signature verification MUST explicitly whitelist permitted algorithms (`HS256`, `RS256`); never accept `alg: none`.

### 11.5 Abuse Prevention & Rate Limiting
- All unauthenticated endpoints (login, register, forgot-password, magic-links) MUST enforce rate limiting (e.g. max 5 failed attempts per IP/minute) with HTTP 429 Too Many Requests response adhering to RFC 7807.
- Resource-intensive export, crawl, or AI inference endpoints MUST be throttled per tenant.

### 11.6 XSS Defense & Output Sanitization
- Never render raw user-provided HTML directly into the DOM.
- In React: Do NOT use `dangerouslySetInnerHTML` unless wrapped with `DOMPurify.sanitize(content)`.
- Configure HTTP response headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.

---

## 12. Production Infrastructure & Container Hardening Standards

Every container, manifest, and service lifecycle contract MUST adhere to CIS Benchmarks and TLPI runtime standards:

### 12.1 Container Immutability & Least Privilege (CIS Docker §4)
- **Non-Root Execution:** Production containers MUST declare a dedicated non-root user (e.g. `USER node`, `USER 10001`). Running as root in the final container stage triggers an automatic build rejection.
- **Base Image Pinning:** Never use `:latest` or unpinned tags in Dockerfile `FROM` lines. Pin to exact semantic versions or sha256 digests (e.g. `node:20.18.0-alpine3.20`).
- **Multi-Stage Builds:** Separate build dependencies (compilers, devDependencies, header files) from runtime images.
- **Zero Secrets in Layers:** Never declare passwords or tokens in `ENV` or `ARG` directives. Use runtime secret mounts.

### 12.2 Kubernetes Manifest Hardening (K8s Best Practices & CIS K8s §5)
- **Compute Resources:** Every container MUST specify both `resources.requests` and `resources.limits` for CPU and Memory. Unbounded containers lead to cluster-wide OOM cascades.
- **Health Probes Separation:**
  - `livenessProbe`: Only checks internal deadlock or runtime crash. NEVER check external databases or network services in liveness probes (prevents cascading restart storms).
  - `readinessProbe`: Checks whether container is warm and ready to receive traffic.
- **Security Context:** Pods and containers MUST set `securityContext.runAsNonRoot: true`, `securityContext.allowPrivilegeEscalation: false`, and `capabilities.drop: [ALL]`.
- **Termination Grace:** `terminationGracePeriodSeconds` must be configured with adequate buffer for in-flight requests (default 30s-60s). Setting to 0 on services is strictly forbidden.

### 12.3 Resilient Lifecycle & Graceful Drain (Systems Performance & TLPI)
- Applications MUST handle `SIGTERM` signals:
  1. Stop accepting new inbound requests (fail readiness probe).
  2. Complete processing of existing in-flight HTTP requests and background worker jobs.
  3. Flush application write buffers and transaction logs.
  4. Close database connection pools cleanly before process exit.

---

## 13. Performance Benchmarking, Load Testing & Profiling Standards

Applications and microservices MUST treat performance as a deterministic mechanical constraint:

### 13.1 Strict Percentile SLAs (Google SRE p.86)
- Performance is judged strictly by percentiles, never averages:
  - **Median ($p50$):** $\le 50\text{ms}$ for CRUD read endpoints.
  - **95th Percentile ($p95$):** $\le 200\text{ms}$ under standard concurrent load.
  - **99th Percentile ($p99$):** $\le 500\text{ms}$ under peak concurrent load.
  - **Error Rate:** $< 0.1\%$ under concurrent load (HTTP 5xx or connection drops).

### 13.2 Load & Stress Testing Harness (`gate perf`)
- Services and endpoints MUST be load-tested using `gate perf` or dedicated `k6` scripts in `tests/load/`:
  ```bash
  gate perf http://localhost:3000/api/v1/resource --concurrency 20 --requests 200 --p95 200 --p99 500
  ```
- Any endpoint that breaches the p95 or p99 SLA triggers a performance REJECT.

### 13.3 Database Query Plan Discipline & N+1 Prevention
- **Index Alignment:** All queries filtering, joining, or sorting on columns MUST be supported by appropriate composite indexes following the **Equality First, Range Second (ESR)** rule.
- **Zero N+1 Queries:** Database fetch operations within loops are strictly prohibited. Use eager loading (`include` in Prisma, `select_related` / `prefetch_related` in Django/SQLAlchemy, `JOIN` in SQL).
- Inspect queries using `EXPLAIN ANALYZE`; sequential scans on tables with $> 1000$ rows trigger optimization review.

### 13.4 Async Event Loop Non-Blocking & Memory Soak Stability
- **Zero Event Loop Starvation:** Async workers (Node.js event loop, Tokio, asyncio) must NEVER execute synchronous blocking calls (e.g. `fs.readFileSync`, `std::thread::sleep`, CPU-intensive crypto) in async handler threads. Delegate to background worker pools (`worker_threads`, `spawn_blocking`).
- **Memory Soak Stability:** Under sustained concurrent traffic (soak testing), Resident Set Size (RSS) memory must stabilize. Linear memory growth indicates unclosed streams or lingering event listeners and triggers a FAIL.
- **Bounded Buffers:** Channel buffers and task queues must always be bounded with explicit backpressure. Unbounded queues turn slow consumers into silent OOM crashes.
