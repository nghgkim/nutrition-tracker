#!/usr/bin/env python3
"""
Module 2: Layout & Viewport Invariants
Audits 100vh studio constraints, horizontal scroll leak, and flexbox button truncation.
"""

def audit_layout_invariants(page, viewport, is_studio=False):
    metrics = page.evaluate("""() => {
        const doc = document.documentElement;
        const body = document.body;
        return {
            scrollHeight: Math.max(doc.scrollHeight, body.scrollHeight),
            scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
            clientHeight: window.innerHeight,
            clientWidth: window.innerWidth,
            isStudio: body.dataset.shell === "studio" || body.classList.contains("studio-shell")
        };
    }""")
    
    studio_mode = is_studio or metrics["isStudio"]
    
    # Invariant 1: Zero vertical scroll in Studio Shell
    vertical_scroll_ok = True
    if studio_mode:
        vertical_scroll_ok = metrics["scrollHeight"] <= metrics["clientHeight"] + 5
        
    # Invariant 2: No unintended horizontal page scrollbar
    horizontal_scroll_ok = metrics["scrollWidth"] <= metrics["clientWidth"] + 2
    
    # Invariant 3: Check for overflowing interactive buttons
    button_overflows = page.evaluate("""() => {
        const overflows = [];
        const buttons = document.querySelectorAll('button, a.btn, [role="button"]');
        for (const btn of buttons) {
            const rect = btn.getBoundingClientRect();
            if (rect.right > window.innerWidth || rect.left < 0) {
                overflows.append(btn.innerText.slice(0, 30));
            }
        }
        return overflows;
    }""")
    
    passed = vertical_scroll_ok and horizontal_scroll_ok and len(button_overflows) == 0
    return {
        "passed": passed,
        "studio_mode": studio_mode,
        "vertical_scroll_passed": vertical_scroll_ok,
        "horizontal_scroll_passed": horizontal_scroll_ok,
        "scroll_height": metrics["scrollHeight"],
        "client_height": metrics["clientHeight"],
        "scroll_width": metrics["scrollWidth"],
        "client_width": metrics["clientWidth"],
        "button_overflows": button_overflows
    }

if __name__ == "__main__":
    print("check_layout module ready.")
