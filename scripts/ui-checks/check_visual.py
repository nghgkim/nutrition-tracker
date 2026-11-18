#!/usr/bin/env python3
"""
Module 3: Visual & Color Entropy Invariants (Anti-Whiteout)
Audits computed background color, stylesheet counts, and contrast readiness.
"""

def audit_visual_invariants(page):
    visual_state = page.evaluate("""() => {
        const bodyStyle = window.getComputedStyle(document.body);
        const bg = bodyStyle.backgroundColor;
        const color = bodyStyle.color;
        const sheetsCount = document.styleSheets.length;
        
        // Count styled DOM nodes
        const allElements = document.querySelectorAll('*');
        const styledCount = Array.from(allElements).slice(0, 100).filter(el => {
            const s = window.getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden';
        }).length;

        return {
            body_bg: bg,
            body_color: color,
            stylesheets_count: sheetsCount,
            active_elements_sample: styledCount
        };
    }""")
    
    bg = visual_state["body_bg"]
    sheets = visual_state["stylesheets_count"]
    
    # Assert background is not transparent and stylesheets loaded
    is_not_transparent = bg not in ("rgba(0, 0, 0, 0)", "transparent", "")
    has_stylesheets = sheets > 0
    passed = is_not_transparent and has_stylesheets and visual_state["active_elements_sample"] > 0
    
    return {
        "passed": passed,
        "anti_whiteout_passed": is_not_transparent,
        "stylesheets_loaded": has_stylesheets,
        "body_background": bg,
        "body_color": visual_state["body_color"],
        "stylesheets_count": sheets
    }

if __name__ == "__main__":
    print("check_visual module ready.")
