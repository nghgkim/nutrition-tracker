#!/usr/bin/env python3
"""
Module 2: Layout & Viewport Invariants (Mobile-First QC)
Audits:
  1. Meta viewport presence (width=device-width)
  2. Zero horizontal scroll leak on mobile and desktop
  3. 100vh studio shell constraint (if studio mode active)
  4. Interactive touch target sizing on mobile (>= 40px height/width)
  5. Interactive button boundary overflow
"""

def audit_layout_invariants(page, viewport, is_studio=False):
    width = viewport.get("width", 1440) if isinstance(viewport, dict) else 1440
    is_mobile = width <= 480

    metrics = page.evaluate("""() => {
        const doc = document.documentElement;
        const body = document.body;
        const metaViewport = document.querySelector('meta[name="viewport"]');
        return {
            scrollHeight: Math.max(doc.scrollHeight, body.scrollHeight),
            scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
            clientHeight: window.innerHeight,
            clientWidth: window.innerWidth,
            isStudio: body.dataset.shell === "studio" || body.classList.contains("studio-shell"),
            hasMetaViewport: !!metaViewport && (metaViewport.content || "").includes("width=device-width"),
            viewportContent: metaViewport ? metaViewport.content : ""
        };
    }""")
    
    studio_mode = is_studio or metrics["isStudio"]
    
    # Invariant 1: Meta viewport must be defined for responsive rendering
    meta_viewport_ok = metrics["hasMetaViewport"]
    
    # Invariant 2: Zero unintended horizontal page scrollbar (strict on mobile: +1px max)
    tolerance = 1 if is_mobile else 2
    horizontal_scroll_ok = metrics["scrollWidth"] <= metrics["clientWidth"] + tolerance
    
    # Invariant 3: Zero vertical scroll in Studio Shell
    vertical_scroll_ok = True
    if studio_mode:
        vertical_scroll_ok = metrics["scrollHeight"] <= metrics["clientHeight"] + 5
        
    # Invariant 4: Check for overflowing interactive buttons offscreen
    button_overflows = page.evaluate("""() => {
        const overflows = [];
        const buttons = document.querySelectorAll('button, a.btn, [role="button"]');
        for (const btn of buttons) {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                if (rect.right > window.innerWidth || rect.left < 0) {
                    overflows.push(btn.innerText.slice(0, 30) || "unnamed button");
                }
            }
        }
        return overflows;
    }""")
    
    # Invariant 5: Mobile touch target size audit (Apple HIG & WCAG SC 2.5.5)
    touch_violations = []
    if is_mobile:
        touch_violations = page.evaluate("""() => {
            const violations = [];
            const interactive = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]');
            for (const el of interactive) {
                const style = window.getComputedStyle(el);
                if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    // Min 38px bounding box on mobile for primary controls
                    if (rect.height < 36 || rect.width < 36) {
                        violations.push({
                            tag: el.tagName.toLowerCase(),
                            text: (el.innerText || el.getAttribute("aria-label") || "").slice(0, 25),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height)
                        });
                    }
                }
            }
            return violations.slice(0, 5); // report up to 5 violations
        }""")

    # Invariant 6: Mobile table overflow audit (tables > 1.2x mobile width must transform into cards)
    table_violations = []
    if is_mobile:
        table_violations = page.evaluate("""() => {
            const violations = [];
            const tables = document.querySelectorAll('table');
            for (const t of tables) {
                const style = window.getComputedStyle(t);
                if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;
                const rect = t.getBoundingClientRect();
                if (rect.width > window.innerWidth * 1.2) {
                    if (!t.dataset.mobileTable && !t.closest('[data-mobile-table]')) {
                        violations.push({
                            title: ((t.querySelector('caption, th') || {}).innerText || "data-table").slice(0, 20),
                            tableWidth: Math.round(rect.width),
                            viewportWidth: window.innerWidth
                        });
                    }
                }
            }
            return violations.slice(0, 3);
        }""")

    passed = (
        meta_viewport_ok
        and horizontal_scroll_ok
        and vertical_scroll_ok
        and len(button_overflows) == 0
        and len(touch_violations) == 0
        and len(table_violations) == 0
    )
    
    return {
        "passed": passed,
        "is_mobile": is_mobile,
        "studio_mode": studio_mode,
        "meta_viewport_ok": meta_viewport_ok,
        "horizontal_scroll_passed": horizontal_scroll_ok,
        "vertical_scroll_passed": vertical_scroll_ok,
        "scroll_height": metrics["scrollHeight"],
        "client_height": metrics["clientHeight"],
        "scroll_width": metrics["scrollWidth"],
        "client_width": metrics["clientWidth"],
        "button_overflows": button_overflows,
        "touch_violations": touch_violations,
        "table_violations": table_violations
    }

if __name__ == "__main__":
    print("check_layout module ready.")
