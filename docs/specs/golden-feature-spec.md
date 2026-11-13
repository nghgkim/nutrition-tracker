# Feature Specification: Automated Invoice Export Pipeline

- **Status:** Approved
- **Date:** 2026-11-06
- **Feature ID:** `invoice-export`
- **Related ADRs:** `docs/decisions/0001-keyset-pagination.md`, `docs/decisions/0002-transactional-outbox.md`

---

## 1. Problem Statement & Context

### 1.1 Target Persona
Enterprise Finance Controller & Compliance Auditor managing monthly accounting reconciliation across thousands of corporate billing accounts.

### 1.2 Business Pain Point
Generating batch invoice exports currently times out on large datasets (> 100,000 records) due to inefficient `OFFSET/LIMIT` SQL queries. Furthermore, non-idempotent re-exports cause duplicate invoice sequences, disrupting accounting ledgers.

### 1.3 Scope Boundaries
- **Scope In:**
  - Streaming JSON and CSV export endpoint for invoices.
  - Keyset / Cursor-based pagination supporting arbitrary volume without deep paging latency penalties.
  - Idempotent export request execution with `Idempotency-Key` headers.
  - RFC 7807 compliant problem details for all client and server error responses.
  - Comprehensive 5-state administrative dashboard UI component.
- **Scope Out:**
  - Direct banking payment gateway settlement (handled by payment-service).
  - Physical paper mail invoice dispatch.

### 1.4 Business Value & Outcome
Eliminates reconciliation timeouts, guarantees 99.99% ledger consistency via idempotency keys, and reduces monthly audit report generation time from 45 minutes to under 5 seconds.

---

## 2. Acceptance Criteria (Gherkin AC Scenarios)

### Scenario AC-1: Paginated invoice export retrieval
```gherkin
Given an authenticated finance user with "finance:read" permissions
And an existing database containing 250,000 invoices
When the client sends "GET /api/v1/invoices?cursor=eyJpZCI6MTAwMH0&limit=50"
Then the response status is 200 OK
And the payload contains an array of 50 invoice items
And the payload contains a non-empty string "next_cursor" token
And the payload contains "has_more: true"
```

### Scenario AC-2: Boundary pagination termination
```gherkin
Given an authenticated finance user
When the client requests the final page using the latest cursor token
Then the response status is 200 OK
And the "items" array contains the remaining records
And "next_cursor" is null
And "has_more" is false
```

### Scenario AC-3: Idempotent export task generation
```gherkin
Given an authenticated user sending "POST /api/v1/invoices/export-jobs"
With header "Idempotency-Key: idemp_job_87123490"
When the first request is processed
Then the response status is 202 Accepted with job status "PENDING"
When an identical second request arrives within 24 hours with "Idempotency-Key: idemp_job_87123490"
Then the response status is 200 OK returning the existing export job without spawning duplicate worker tasks
```

### Scenario AC-4: Malformed cursor error response (RFC 7807)
```gherkin
Given an authenticated user
When the client sends "GET /api/v1/invoices?cursor=INVALID_BASE64_CORRUPT"
Then the response status is 400 Bad Request
And the response Content-Type is "application/problem+json"
And the JSON payload matches:
  | field    | value                                                      |
  | type     | https://api.example.com/errors/invalid-cursor              |
  | title    | Invalid Keyset Cursor Token                                |
  | status   | 400                                                        |
  | detail   | The provided cursor token is corrupted or expired.        |
  | instance | /api/v1/invoices                                           |
```

---

## 3. API Contract & Data Schema

### 3.1 HTTP Endpoints
- `GET /api/v1/invoices` — Retrieve paginated invoices with cursor tokens.
- `POST /api/v1/invoices/export-jobs` — Trigger background asynchronous batch export.

### 3.2 Request & Response Schema (TypeScript)
```typescript
export interface InvoiceItemDTO {
  id: string;
  invoice_number: string;
  account_id: string;
  total_amount_cents: number;
  currency: "USD" | "EUR" | "VND";
  status: "DRAFT" | "ISSUED" | "PAID" | "VOID";
  issued_at: string; // ISO 8601
  created_at: string;
}

export interface InvoiceListResponse {
  items: InvoiceItemDTO[];
  next_cursor: string | null;
  has_more: boolean;
  page_size: number;
}

export interface ProblemDetailsRFC7807 {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  invalid_params?: Array<{ name: string; reason: string }>;
}
```

### 3.3 Database Storage Contract (PostgreSQL DDL)
```sql
CREATE TABLE invoices (
  id BIGSERIAL PRIMARY KEY,
  uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  account_id UUID NOT NULL,
  invoice_number VARCHAR(64) NOT NULL UNIQUE,
  total_amount_cents BIGINT NOT NULL CHECK (total_amount_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ESR Composite Index: Equality (account_id, status) -> Sort/Range (created_at, id)
CREATE INDEX idx_invoices_account_status_cursor 
ON invoices (account_id, status, created_at DESC, id DESC);
```

---

## 4. UI Design System, Archetype & 5-State Mockup

### 4.1 UI Layout Archetype & Design Theme
- **Layout Archetype:** Master-Detail Application Shell featuring collapsible sidebar navigation, sticky header with breadcrumb and global command palette search (`Cmd+K`), and elevated main data canvas.
- **Visual Design Theme:** *Linear Dark* (`#0c0d0e` canvas, `#151618` card surfaces, subtle light rim `ring-1 ring-inset ring-white/[0.06]`) with toggle support for *Nordic Clean Light* (`#f8fafc` canvas, `#ffffff` surfaces, `border-slate-200`).
- **Semantic Design Tokens:**
  - Canvas: `bg-canvas` (`#0c0d0e` / `#f8fafc`)
  - Surface/Card: `bg-surface` (`#151618` / `#ffffff`)
  - Border: `border-borderSubtle` (`rgba(255, 255, 255, 0.08)` / `#e2e8f0`)
  - Text: `text-textPrimary` (`#ededed` / `#0f172a`), `text-textMuted` (`#8a8f98` / `#64748b`)
  - Accent: `bg-blue-600` (`#2563eb`), hover `bg-blue-500` (`#3b82f6`)
- **Interactive Tactile Response:** All clickable elements (buttons, row items) strictly enforce `active:scale-[0.98] transition-all duration-150`.
- **Interactive Standalone Mockup Artifact:** [`docs/mockups/golden-invoice-export.html`](file:///home/ubuntu/Code/Personal/orchestrator/docs/mockups/golden-invoice-export.html) (provides real-time browser preview and interactive 5-state switcher).

### 4.2 Spacing Scale & Typography System
- **Spacing Grid:** Strictly multiples of 4px/8px (`gap-4`: 16px, `p-6`: 24px, `p-8`: 32px, `rounded-xl`: 12px).
- **Typography:** Two weights (`font-normal`: 400, `font-semibold`: 600), three text tokens (`text-slate-900`, `text-slate-600`, `text-slate-400`).
- **Interactive Targets:** Primary action button height $\ge 40\text{px}$, table row height $\ge 48\text{px}$.

### 4.3 ASCII Wireframe
```text
+-------------------------------------------------------------------------------+
| [AC] Acme Corp v | Billing / Invoices / Export        [ Cmd+K Search... ] [ + Export ]
+-------------------------------------------------------------------------------+
| [Filters: Status: All v ] [ Period: Last 30 Days v ]            [ Download CSV ]|
+-------------------------------------------------------------------------------+
| Invoice ID    | Account Name       | Issue Date   | Total Amount | Status     |
+---------------+--------------------+--------------+-------------+-------------+
| INV-2026-0042 | Acme Cloud Services| 2026-11-06   | $14,250.00  | [ PAID ]    |
| INV-2026-0041 | Globex Logistics   | 2026-11-05   | $8,920.50   | [ ISSUED ]  |
| INV-2026-0040 | Initech Software   | 2026-11-05   | $750.00     | [ PAID ]    |
+-------------------------------------------------------------------------------+
| Showing 50 invoices (next_cursor: "eyJpZ...")      [ Prev ]  Page 1  [ Next ] |
+-------------------------------------------------------------------------------+
```

### 4.4 Five View States Matrix
1. **Initial / Pristine:** Filters displayed with default parameters (last 30 days, status: all). Action buttons enabled.
2. **Loading Skeleton:** Table headers rendered; table body shows 8 pulsing skeleton rows with matching column widths to eliminate Cumulative Layout Shift (CLS).
3. **Empty State:** When no invoices match filters: Displays subtle folder illustration, heading `"No invoices found for this period"`, supporting subtext, and a clear CTA button `[ Clear Filters ]`.
4. **Error with Retry:** Network disconnection or 5xx error: Displays amber alert card with human-readable error, RFC 7807 problem reference, and an inline `[ Retry Connection ]` button.
5. **Success / Content:** Full data grid loaded; numeric fields aligned right; status badges use WCAG AA compliant contrast ratios ($\ge 4.5:1$).

---

## 5. Technical Invariants & Knowledge Base Grounding

### 5.1 Architecture & Clean Code Invariants
1. **Clean Architecture Boundary Invariant:**
   - Cites: **Clean Architecture** (Robert C. Martin) — Chapter 22: *The Clean Architecture* & **Domain-Driven Design** (Eric Evans).
   - Strict 3-tier decoupling: `Transport (REST Controllers)` $\rightarrow$ `Domain Core (UseCases & Keyset Streamer)` $\rightarrow$ `Persistence Adapter (SQL Repositories)`. Business entities are 100% framework-agnostic.
2. **Clean Code Small Function Rule:**
   - Cites: **Clean Code** (Robert C. Martin) — Chapter 3: *Functions* (p.34-36).
   - Functions do one thing; maximum function length $\le 30$ lines; zero boolean flag arguments (split into distinct intention-revealing functions).
3. **Keyset Pagination Invariant:**
   - Cites: **API Design Patterns** (JJ Geewax) — Chapter 21: *Page Tokens & Keyset Pagination* (p.326).
   - Rejects `OFFSET/LIMIT` SQL queries. All cursor queries execute: `WHERE (created_at, id) < (:cursor_created_at, :cursor_id) ORDER BY created_at DESC, id DESC LIMIT :limit`.
4. **Idempotency Invariant:**
   - Cites: **API Design Patterns** (JJ Geewax) — Chapter 25: *Idempotent Mutations* (p.407, 415–416).
   - Any mutating endpoint requires `Idempotency-Key` persisted in transactional storage.
5. **Composite Index ESR Rule:**
   - Cites: **Designing Data-Intensive Applications** (Martin Kleppmann) — Chapter 3: *Storage and Retrieval* (p.109).
   - Ordering rule: *Equality -> Sort -> Range*.
6. **Error Contract Invariant:**
   - Cites: **Clean Code** (Robert C. Martin) — Chapter 7: *Error Handling* & **RFC 7807**.
   - Zero generic 500 errors returned to clients; structured error objects with actionable remediation details.
1. **Keyset Pagination Invariant:**
   - Cites: **API Design Patterns** (JJ Geewax) — Chapter 21: *Page Tokens & Keyset Pagination* (p.326).
   - Rejects `OFFSET/LIMIT` SQL queries. All cursor queries execute: `WHERE (created_at, id) < (:cursor_created_at, :cursor_id) ORDER BY created_at DESC, id DESC LIMIT :limit`.
2. **Idempotency Invariant:**
   - Cites: **API Design Patterns** (JJ Geewax) — Chapter 25: *Idempotent Mutations* (p.407, 415–416).
   - Any mutating endpoint requires `Idempotency-Key` persisted in transactional storage.
3. **Composite Index ESR Rule:**
   - Cites: **Designing Data-Intensive Applications** (Martin Kleppmann) — Chapter 3: *Storage and Retrieval* (p.109).
   - Ordering rule: *Equality -> Sort -> Range*.
4. **Error Contract Invariant:**
   - Cites: **Clean Code** (Robert C. Martin) — Chapter 7: *Error Handling* & **RFC 7807**.
   - Zero generic 500 errors returned to clients; structured error objects with actionable remediation details.
