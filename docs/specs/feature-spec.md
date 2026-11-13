# Feature Specification: [Feature Name]

- **Status:** Draft | In Review | Approved
- **Date:** YYYY-MM-DD
- **Related ADRs:** [e.g., ADR-0001 or None]

---

## 1. Product Requirements (Why & What)

### 1.1 Problem Statement & User Persona
- **Who:** [Target user role / persona]
- **Problem:** [Clear pain point this feature addresses]
- **Value:** [Expected business outcome or user benefit]

### 1.2 User Story & Scope
- **Story:** As a [user], I want to [action], so that [outcome].
- **In-Scope:** [2-4 primary deliverables]
- **Out-of-Scope:** [Explicitly deferred items — no scope creep]

### 1.3 Acceptance Criteria (AC)

Gherkin-style. Each AC becomes a test case in Gate 3 / Gate 5.

- **AC-1:** Given [precondition], When [action], Then [expected result].
- **AC-2:** Given [invalid input], When [submitted], Then [RFC 7807 error returned].

### 1.4 UI & Interaction Specification (Required if feature touches Frontend)

Complete this section when the change affects `frontend/`, `web/`, `ui/`, or any
rendered screen. Leave it as `N/A — backend-only` otherwise.

- **Knowledge Base Citations:**
  - Empty states are a first interaction, not an afterthought; include
    illustration plus emphasized CTA (Start with a feature, not a layout —
    Don't overlook empty states — p.203-205).
  - Hierarchy via weight/color before size; two weights (400/500 normal,
    600/700 emphasis) and two to three text colors suffice (Start with a
    feature, not a layout — Size isn't everything — p.32-35).
  - Add-then-remove whitespace: start with too much space, remove until done
    (Start with a feature, not a layout — Start with too much white space —
    p.57-59). Reuse one spacing scale for speed and consistency (Start with a
    feature, not a layout — Establish a spacing and sizing system — p.63-64).
  - Borders distract; a subtle box shadow outlines just as well (Start with a
    feature, not a layout — Use fewer borders > Use a box shadow — p.207-208).

- **Screen Inventory & Navigation Map:**
  - List every affected screen: `[Screen A] -> [Action] -> [Screen B]`.
  - Example: `[List] -> [Create] -> [Detail] -> [Edit] -> [List]`.
  - Mark entry points and emergency exits (cancel/back affordance per screen).

- **Component Layout & ASCII Mockups:**
  - Medium-fidelity ASCII wireframe is mandatory for the primary screen.
  - Draw layout boxes with header / content / action zones, e.g.:
  - `+--------------------------------------+`
  - `| Header (title + primary CTA)         |`
  - `+--------------------------------------+`
  - `| [Illustration / Skeleton / Rows]     |`
  - `| [Inline error + Retry button]        |`
  - `+--------------------------------------+`
  - Annotate interactive elements with signifiers (cursor/hover/focus state).

- **5-State Matrix (every async view must define all five):**
  - [ ] Blank / First-time Empty: illustration + explanatory copy + primary CTA
    (never bare "No data"). Hide dead tabs/filters until content exists.
  - [ ] Loading: skeleton matching final layout, no layout shift, immediate
    feedback (spinner/disabled label) to prevent double-submit.
  - [ ] Error: human-readable message + inline recovery action (Retry / Go back),
    no bare codes.
  - [ ] Partial / Sparse Data: truncated lists, missing avatars, paginated
    continuation defined.
  - [ ] Ideal / Full Content: realistic sample with hierarchy (weight/color first).

- **Design Tokens & Mechanical Constraints:**

  | Token Category | Allowed Values / Tokens | Mechanical Constraint |
  |---|---|---|
  | Spacing Scale | `0, 4px (1), 8px (2), 12px (3), 16px (4), 24px (6), 32px (8), 48px (12), 64px (16)` | Reject odd or off-scale values (`6, 10, 13, 14, 20, 22, 28, 56px`). Applies to margin, padding, gap. |
  | Typography Scale | `xs: 12px, sm: 14px, base: 16px, lg: 18px, xl: 20px, 2xl: 24px` | Hierarchy via weight (600/700) and muted color first, size second. Max two weights and three text colors per view. |
  | Elevation | `shadow-sm, shadow-md, shadow-lg` | Card/panel container MUST use box-shadow; bare `border: 1px` alone is Gate 1 REJECT. |
  | Target Sizes | Primary buttons `>=36px` height; minimum interactive target `>=24px` (WCAG 2.2 AA SC 2.5.8, external standard) | Targets under 24x24px without compensation fail validation. |
  | Contrast | Normal text `>=4.5:1`, large text/icons `>=3.0:1` | Verify mechanically via axe-core against background token. |

- **Primitives Vendoring Rule:** when `components/ui/` exists (Radix/shadcn), compose only via props/slots; never edit internals or fork ARIA/focus-trap logic.

---

## 2. Technical Design & Architecture (How)

### 2.1 Domain & Contract Grounding
- **Knowledge Base Citation:** [Book — Chapter — p.X from a kb tool call in THIS session; UNVERIFIED if absent]
- **Endpoint / Transport Interface:**
  - `POST /api/v1/...`
  - Request DTO & Response Schema (strict types)

### 2.2 Invariants & Edge Cases
- State boundary handling (loading, error, empty, offline).
- Idempotency & data access concurrency constraints.

---

## 3. Verification Checklist
- [ ] Spec approved by user
- [ ] Unit & integration tests written matching AC-1, AC-2
- [ ] Gate validation passed (`gate check`)
