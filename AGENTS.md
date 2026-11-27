# Agent Context & Engineering Guidelines

> Project-level contract (Repo-Level Invariants). The agent MUST read this file before any task.

- **Language**: Respond in the user's input language. All technical decisions,
  tool calls, and book queries stay in English.

## 0. Strict Language Boundary

1. **Chat / terminal output:** user's language (e.g., Vietnamese).
2. **Repository artifacts (ALL files written to disk):** 100% professional
   technical English. Applies to `docs/specs/*.md`, `docs/decisions/*.md`,
   code comments, docstrings, schema descriptions, commit messages.
   FORBIDDEN: mixing Vietnamese sentences/grammar into files.
3. **Cleanup command:** *"Standardize file `docs/...` to 100% technical
   English, keeping Markdown structure and invariants."*

<!-- STACK SECTIONS 1-3: stamped by skill `tech-stack-architect`.
     NEVER hand-fill framework versions or CLI commands from memory:
     ask the agent to run tech-stack-architect (KB docs + live verification). -->

## 1. Stack & System Overlay Binding
- **Primary Stack:** Next.js 16.4.6 (App Router)
- **Archetype:** frontend
- **Runtime Version:** v20.20.2
- **Package & Environment Manager:** npm
- **Core Libraries:** next 16.4.6, react 19.3.0, @prisma/client 7.10.1, tailwindcss (dev) 4.3.5, vitest (dev) 4.1.12
- **Knowledge Base Doc Sources:** `gate kb search` / local book catalog

---

## 2. Local Toolchain & Execution Commands
Commands below are mechanically verified against the repository toolchain.

| Purpose | Command | Notes |
|---|---|---|
| **Test Suite** | `npm test` | Must exit 0 across unit & integration tests |
| **Targeted Test** | `npm test -- <test-file>` | Fast TDD feedback loop |
| **Lint & Format** | `npm run lint` | Auto-fix code style & verify invariants |
| **Type / Compile Check** | `npm run typecheck` | Strict TypeScript compiler check |
| **DB Migration** | `npx prisma migrate dev` | Sync schema changes to database |
| **Apply Migration** | `npx prisma migrate deploy` | Requires Tier-2 approval |
| **Smoke Gate** | `bash scripts/smoke.sh` | End-to-end service smoke verification |
| **Visual UI Gate** | `python3 scripts/verify-ui.py` | Playwright 4-viewport screenshot & anti-whiteout audit |

---

## 3. Directory Layout & Module Boundaries
```text
src/
├── app/               # Next.js App Router (pages, layouts, route handlers)
│   ├── api/           # REST API Route Handlers
│   └── (features)/    # Domain feature pages & layouts
├── components/        # Reusable UI & design token components
├── lib/               # Pure domain logic & service helpers (testable)
└── prisma/            # Database schema & migrations
```

---

## 4. Architectural Decision Records (ADRs) & Invariants

Stack-independent (from the 8 Universal Skills). NEVER change a ratified rule
without a superseding ADR. Read the detail file in `docs/decisions/` only when
an edge case needs the rationale:

| ID | Ratified decision | Mechanical invariant | Detail file |
|---|---|---|---|
| ADR-0001 | Canonical spec accepted; five bounded contexts ratify the implemented scope | `docs/specs/nutrition-tracker.md` is `Accepted`; feature specs remain historical records | `docs/decisions/0001-canonical-spec-and-scope.md` |
| ADR-0002 | Request input is parsed only by shared helpers; local calendar days | No `Number()` on request data in route handlers; invalid input returns 400 before Prisma | `docs/decisions/0002-request-boundary-validation.md` |
| ADR-0003 | UI evidence must be certified and authenticated | `certification.certified` true, no `login_redirects`, declared states detected | `docs/decisions/0003-ui-evidence-contract.md` |

---

## 5. Execution Workflow Reference (4-Phase Dual-Mode)

Follow the 4-Phase functional pipeline in `workflows/feature-delivery.md`:
1. **Phase 1: BA-PO** (`docs/specs/<feature>.md` + Gherkin ACs)
2. **Phase 2: DEV** (Data schema + TDD implementation `src/` & `tests/`)
3. **Phase 3: QC** (Adversarial testing, AC traceability, `gate audit`, evidence)
4. **Phase 4: DEVOPS** (Packaging, manifests, staging verification, PR creation)

### Dual-Mode Execution:
- **Mode 2: Zero-Human Autonomous (DEFAULT — Human Intervention Minimized):**
  Human intervention is strictly confined to initial goal prompt and Circuit Breaker escalation (if QC defects exceed 3 cycles).
  - Auto-approves spec via Rubric Judge (`gate judge` >= 90/100).
  - Auto-scaffolds 5-state UI mockups and captures Playwright visual snapshots.
  - Auto-executes TDD Red-Green-Refactor cycles in DEV.
  - QC auto-loops defects back to DEV via `qa-defects.json` (Circuit Breaker: max 3 cycles).
  - DevOps runs automated security audits, spins up ephemeral Postgres sandboxes (`gate db test`), and creates a complete Git PR (`gate pr create`).
  - Master runner: `gate run <feature> [title]` executes all 4 phases autonomously end-to-end.
- **Mode 1: Human-in-the-Loop (Interactive — Optional):**
  Pass `--mode=hitl` explicitly when interactive human review is requested at Phase 1 or Phase 4.

### Tiers of Delivery:
- **Tier 0 (Spike / Feasibility PoC):** Time-boxed technical exploration (<= 3 days) on branch `spike/*` to resolve high uncertainty and measure empirical benchmarks. Bypasses BA-PO ceremony. Output: `docs/specs/spike-<topic>.md` with Go/No-Go decision. Invariant: Spike code must strictly transition to Phase 1 BA-PO (Tier 2/3) before production. Verify via `gate check --tier=spike`.
- **Tier 1 (Patch / Bugfix):** Fast-track. Bypasses Phase 1 BA-PO spec. Requires TDD cycle (reproduce test -> fix -> linter). Verify via `gate check --tier=patch`.
- **Tier 2 (Minor Feature):** Requires Mini-spec in `docs/specs/<feature>.md` (AC Gherkin + Contract diff).
- **Tier 3 (Major / Architecture):** Full 4-Phase progression, ADR in `docs/decisions/`, full spec & mockups.

**Book Grounding (`kb_retrieve_passages`):**
Mandatory for Architectural decisions (ADRs in Phase 1), Data Concurrency/Locking (Phase 2), Cryptography/Auth (Phase 3), and Distributed Systems/SLO (Phase 4). Pure domain business logic and small bugfixes do not require artificial citations.

## 6. Spec-Before-Code Invariant (STRICTLY ENFORCED)

- **Tier 2 & Tier 3:** FORBIDDEN to create or modify code under `src/`, `app/`, `lib/`,
  `backend/`, `frontend/`, `pkg/`, `cmd/`, or `internal/` before a spec exists at
  `docs/specs/<feature>.md`.
- **Tier 1 (Bugfixes):** Permitted to modify code directly accompanied by new/updated test cases.
- Run `gate check [--tier=patch|minor|major] [--mode=hitl|auto] [--phase=ba|dev|qc|devops]` to mechanically verify invariants.

---

## 7. Skill Discovery & Intent-to-Skill Routing (Anti-Amnesia Invariant)

To prevent context dilution across 74+ skills, agents MUST NOT guess or invent patterns.
When addressing user requests, the agent MUST route the task to the exact specialized skill using:
`gate skill find "<keywords>"` or consulting the taxonomy below:

| Domain / User Goal | Primary Skill | Secondary / Fallback | Phase Binding |
|---|---|---|---|
| **Faux UI, Animated Demo, Cursor Walkthrough** | `stageshow` | `slack-gif-creator`, `web-artifacts-builder` | Phase 1 & 2 (BA-PO & DEV) |
| **Production UI/UX, Design Systems, Tailwind, 5-State UI** | `frontend-craftsman` | `frontend-engineering-and-ui`, `theme-factory` | Phase 1 & 2 (BA-PO & DEV) |
| **Landing Pages & Website Aesthetics** | `website-designer` | `frontend-design`, `theme-factory` | Phase 1 & 2 (BA-PO & DEV) |
| **Acceptance Criteria, Gherkin, Feature Spec** | `product-analyst` | `doc-coauthoring` | Phase 1 (BA-PO) |
| **API Contract (REST/RPC), Domain Model, Idempotency** | `api-and-domain-design` | `system-design`, `stacks` | Phase 1 & 2 (BA-PO & DEV) |
| **Database Schema, ESR Composite Indexes, Migrations** | `database-modeling-and-access` | `qc-database` | Phase 2 & 3 (DEV & QC) |
| **Event-Driven, Kafka, RabbitMQ, Transactional Outbox** | `dev-event-driven` | `system-design` | Phase 2 (DEV) |
| **Resilient Integrations, Circuit Breakers, Retry Backoff** | `dev-resilient-integration` | `chaos-and-edge-hunter` | Phase 2 (DEV) |
| **Clean Code, Function Heuristics, Refactoring Smells** | `clean-code` | `clean-functions`, `clean-refactoring` | Phase 2 (DEV) |
| **Concurrency, Thread Safety, Mutex, Deadlocks** | `clean-concurrency` | `testing-and-refactoring` | Phase 2 (DEV) |
| **Security Auditing, OWASP Top 10, JWT, IDOR, Injection** | `app-security-hardening` | `code-auditor` | Phase 3 & 4 (QC & DevOps) |
| **Adversarial Edge Cases, Fuzzing, Resource Exhaustion** | `chaos-and-edge-hunter` | `test-craftsman` | Phase 3 (QC) |
| **Performance Benchmarking, k6, Latency SLAs (p95/p99)** | `qc-performance-load` | `observability-and-release` | Phase 3 (QC) |
| **Frontend 5-State UI Verification & Playwright Visuals** | `qc-frontend` | `webapp-testing` | Phase 3 (QC) |
| **Backend Contract Drift & RFC 7807 Verification** | `qc-backend` | `contract-verifier` | Phase 3 (QC) |
| **Kubernetes Manifest Hardening & CIS Benchmark** | `k8s-manifest-hardening` | `observability-and-release` | Phase 4 (DevOps) |
| **Observability, Distributed Tracing, Graceful SIGTERM** | `observability-and-release` | `linux-ops-troubleshooting` | Phase 4 (DevOps) |
| **Release Strategies, Blue/Green, Canary, Rollback** | `ops-release-strategies` | `observability-and-release` | Phase 4 (DevOps) |
| **Linux Runtime Incident Troubleshooting & USE Method** | `linux-ops-troubleshooting` | `observability-and-release` | Phase 4 (DevOps) |
| **Knowledge Base Book Citations, Technical Verification** | `kb-researcher` | `kb-helper` | All Phases |

Skill Commands:
- `gate skill find "<keywords>"`: Search skills by intent with relevance ranking.
- `gate skill list [category]`: List all skills in taxonomy clusters.
- `gate skill map`: Display intent-to-skill matrix.
- `gate skill doctor`: Validate skill integrity on disk.

---

## 8. Proactive Engineering & Value-Add Protocol (Strictly Anti-Passive)

Agents MUST NOT passively output "Task completed" and terminate. Task completion is the baseline; anticipating production failures, researching edge cases, and proposing high-leverage improvements is where elite engineering value is delivered.

At the end of every substantive turn or milestone, the agent MUST deliver:
1. **Precise Next Step (`gate status` / `gate next`)**: Explicit status, completed task count, and next actionable command.
2. **Proactive Deep-Dive (Pain Points & Hidden Edge-Cases)**:
   - Identify at least 1–2 non-obvious failure modes, race conditions, or performance bottlenecks.
   - Cross-reference with Knowledge Base books (`gate kb search`) or internet research (`search_web`).
   - Run `gate scout` to inspect archetype-specific risks and counter-measures.
3. **Actionable Improvement Proposals**:
   - Provide 2–3 concrete, high-leverage proposals (e.g. distributed caching, idempotency deduplication, graceful degradation, circuit breaker, or automated benchmarking).
   - Format each proposal with:
     - **Benefit**: Concrete user or system value.
     - **Trade-off**: Complexity/Effort vs Impact.
     - **Trigger Command**: The exact prompt or CLI command the user can type to execute it immediately.
