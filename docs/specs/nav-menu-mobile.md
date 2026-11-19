# Feature Spec: Mobile Menu Scroll & Visible Label (Tier 2)

**Status:** Draft
**Tier:** 2 (Minor — nav menu UI)
**Date:** 2026-11-19
**Grounding:** Principle VII (Five Whys, Mermaid, trade-offs); Principle VIII (mobile viewport, touch)

## 1. Problem & Context
- On 375px the "Thêm" dropdown contains 5 groups and is taller than the viewport; lower items (Khác, Đăng xuất) can be unreachable.
- The menu button shows only a chevron on mobile (`hidden sm:inline`), so users cannot tell it is the menu.

### Five Whys
1. Why can lower menu items be unreachable? The dropdown grows with content, no height bound.
2. Why no bound? It was designed for desktop where the viewport is taller.
3. Why no label on mobile? `hidden sm:inline` was applied to save horizontal space.
4. Why is that bad? A bare chevron is ambiguous; accessibility label is missing too.
5. Why fix now? Owner asked to continue both improvements.
Root cause: **menu styling was optimized for desktop density, not mobile reachability**.

## 2. Acceptance Criteria (Gherkin)
AC-1: Given a 375x667 viewport, When the menu opens, Then its bounding height <= viewport - 100px and it scrolls internally.
AC-2: Given the menu scrolled to the bottom, When "Đăng xuất" is tapped, Then logout works.
AC-3: Given mobile, When the header renders, Then the menu button shows the text "Thêm" next to the chevron.
AC-4: Given the button, When measured, Then width/height >= 44px and header has no horizontal leak.
AC-5: Given 1440px, When the menu opens, Then it remains a compact dropdown with unchanged labels.
AC-6: Given outside click/Esc, When menu is open, Then it still closes (existing invariant).

## 3. UX 5-state map
| State | Menu button | Dropdown |
|---|---|---|
| Closed | "Thêm ⌄" | hidden |
| Open | "Thêm ⌃" | bounded, scrollable |
| Scrolled | same | bottom items visible |
| Logged out | login/register | none |

## 3b. Design tokens
Emerald primary, Nordic light/dark, 44px touch base.

## 3c. Architecture & mental model
```mermaid
flowchart LR
  BTN[Thêm button with label] --> DROP[absolute dropdown]
  DROP --> MAX[max-h calc(100vh-100px) + overflow-y-auto]
  MAX --> ITEMS[all 5 groups reachable]
```
- Pure CSS/JSX change; no state logic beyond `moreOpen` (already present).

## 3d. Failure modes & resilience
- Very short viewport (<500px) -> internal scroll, header stays fixed.
- Sticky group headers not required; scrolling reveals all items.
- Outside-click/Esc handlers unchanged.

## 3e. QA matrix & harness
| Area | Type | Command |
|---|---|---|
| UI | Playwright | 375 menu box, scroll to logout, label text |
| Touch/leak | script | `audit_layout_invariants` |
| Regression | full | build/typecheck/lint/test/smoke + verify-ui |

## 4. Contract (REST)
No endpoint change.

## 5. Data Schema
No Prisma change.

## 6. Trade-offs & rejected alternatives
- Rejected: bottom sheet -> gesture/focus complexity for a simple list.
- Rejected: remove groups to shorten -> loses functionality.
- Rejected: keep chevron-only and add `aria-label` -> sighted users still confused; visible text is better.
- Chosen: bounded scrollable dropdown + visible label.

## 7. Key engineering takeaways
- Any overlay with dynamic content needs a height budget on mobile.
- Icon-only controls need visible text when their meaning is not universally recognised.
- Preserve existing dismissal behaviour when changing only presentation.

## 8. Security & performance
- Pure UI change; 401 gate and API untouched.

## 9. Evidence
- Spec judge: 93/100
- Mobile button now shows "Thêm" text (was chevron-only), min-h 44px; dropdown max-h calc(100vh-100px) with overflow-y-auto
- Playwright 375x667: button label "Thêm", 44px, menu height 567px (exactly limit) and scrollable, "Đăng xuất" present in DOM; desktop 1440 stays compact (no scroll); audit passed both viewports
- Outside-click/Esc dismissal unchanged
- Build/typecheck/lint PASS; tests 41/41; smoke 9/9; verify-ui 4/4 viewports PASS; URL HTTP 200
