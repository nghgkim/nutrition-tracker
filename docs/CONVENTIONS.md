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

## 6. Frontend 5-State UI Conventions

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
