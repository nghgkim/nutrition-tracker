#!/usr/bin/env python3
"""
Visual Verification Gate - executable evidence for QC Phase 3.
Captures screenshots across viewports, asserts CSS/subresources load (no whiteout),
and checks computed styles. Writes evidence to docs/evidence/<feature>/visual/.

Usage: python3 scripts/verify-ui.py <base-url> [feature-name]
Example: python3 scripts/verify-ui.py http://192.168.1.115:3000 nutrition-tracker
"""
import sys, os, json
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
FEATURE = sys.argv[2] if len(sys.argv) > 2 else "feature"
OUT = f"docs/evidence/{FEATURE}/visual"
os.makedirs(OUT, exist_ok=True)

VIEWPORTS = [(1440, 900), (1024, 768), (768, 1024), (600, 900)]
report = {"base": BASE, "feature": FEATURE, "checks": [], "screenshots": []}
failed_css = []
page_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for w, h in VIEWPORTS:
        page = browser.new_page(viewport={"width": w, "height": h})
        page.on("response", lambda r: failed_css.append((r.status, r.url)) if ".css" in r.url and r.status >= 400 else None)
        page.on("pageerror", lambda e: page_errors.append(str(e)[:200]))
        page.goto(f"{BASE}/login", wait_until="networkidle")
        # subresource audit
        bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
        sheets = page.evaluate("document.styleSheets.length")
        # color entropy (anti-whiteout): sample via canvas of screenshot bytes not trivial; use computed styles proxy
        css_ok = bg not in ("rgba(0, 0, 0, 0)", "transparent") and sheets > 0
        report["checks"].append({
            "viewport": f"{w}x{h}",
            "body_bg": bg,
            "stylesheets": sheets,
            "css_loaded": css_ok,
        })
        shot = f"{OUT}/login-{w}x{h}.png"
        page.screenshot(path=shot, full_page=True)
        report["screenshots"].append(shot)
        page.close()
    browser.close()

report["failed_css"] = failed_css
report["page_errors"] = page_errors
report["passed"] = (
    all(c["css_loaded"] for c in report["checks"])
    and len(failed_css) == 0
    and len(page_errors) == 0
)

with open(f"{OUT}/report.json", "w") as f:
    json.dump(report, f, indent=2)

print(json.dumps(report, indent=2))
sys.exit(0 if report["passed"] else 1)
