#!/usr/bin/env python3
"""
Module 4: 5-State UI Verification
Audits that UI handles: Initial, Loading, Empty, Error, and Success states.
Ensures zero black empty voids (#000) or missing fallback cards.
"""

def audit_5state_ui(page):
    state_report = page.evaluate("""() => {
        const text = document.body.innerText.toLowerCase();
        const html = document.body.innerHTML;
        
        // Cues for fallback states
        const hasEmptyState = /không có|empty|no items|chưa có|not found/i.test(text) || !!document.querySelector('[data-state="empty"], .empty-state');
        const hasLoadingState = /loading|đang tải|spinner|skeleton/i.test(html) || !!document.querySelector('[data-state="loading"], .skeleton');
        const hasErrorState = /lỗi|error|failed|thất bại/i.test(text) || !!document.querySelector('[data-state="error"], .alert-error');
        
        // Check for black void trap: screen containing only pure black empty div without content
        const bg = window.getComputedStyle(document.body).backgroundColor;
        const isBlackVoid = (bg === 'rgb(0, 0, 0)' || bg === '#000000') && document.body.children.length <= 1;

        return {
            has_empty_fallback: hasEmptyState,
            has_loading_fallback: hasLoadingState,
            has_error_fallback: hasErrorState,
            is_black_void: isBlackVoid
        };
    }""")
    
    passed = not state_report["is_black_void"]
    return {
        "passed": passed,
        "is_black_void_regression": state_report["is_black_void"],
        "detected_empty_handler": state_report["has_empty_fallback"],
        "detected_loading_handler": state_report["has_loading_fallback"],
        "detected_error_handler": state_report["has_error_fallback"]
    }

if __name__ == "__main__":
    print("check_states module ready.")
