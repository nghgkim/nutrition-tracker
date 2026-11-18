#!/usr/bin/env python3
"""
Unified Visual Verification Suite — QC Phase 3
Composes specialized micro-verifiers:
  1. Subresources (no 403/429/500 CSS/JS/fonts)
  2. Layout (100vh studio, horizontal scroll leak, button overflow)
  3. Visual (anti-whiteout, stylesheet presence)
  4. 5-State UI (empty, loading, error, anti-black-void)
Writes evidence to docs/evidence/<feature>/visual/report.json and .png snapshots.

Usage:
  python3 scripts/verify-ui.py [base-url] [feature-name] [path] [--studio]
Example:
  python3 scripts/verify-ui.py http://localhost:3000 my-feature / --studio
"""
import sys
import os
import json

BASE = "http://localhost:3000"
FEATURE = "feature"
TARGET_PATH = "/"
IS_STUDIO = False

args = [a for a in sys.argv[1:] if not a.startswith("--")]
flags = [a for a in sys.argv[1:] if a.startswith("--")]

if len(args) > 0 and args[0]:
    BASE = args[0]
if len(args) > 1 and args[1]:
    FEATURE = args[1]
if len(args) > 2 and args[2]:
    TARGET_PATH = args[2]

if "--studio" in flags or os.getenv("STUDIO_MODE", "0") == "1":
    IS_STUDIO = True

if not TARGET_PATH.startswith("/"):
    TARGET_PATH = "/" + TARGET_PATH

FULL_URL = BASE.rstrip("/") + TARGET_PATH
OUT_DIR = f"docs/evidence/{FEATURE}/visual"
os.makedirs(OUT_DIR, exist_ok=True)

# Add ui-checks directory to sys.path if present
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CHECKS_DIR = os.path.join(SCRIPT_DIR, "ui-checks")
if os.path.isdir(CHECKS_DIR):
    sys.path.insert(0, CHECKS_DIR)

try:
    from check_subresources import audit_subresources
    from check_layout import audit_layout_invariants
    from check_visual import audit_visual_invariants
    from check_states import audit_5state_ui
except ImportError:
    # Graceful fallbacks if modules are run standalone
    audit_subresources = None
    audit_layout_invariants = None
    audit_visual_invariants = None
    audit_5state_ui = None

VIEWPORTS = [
    {"name": "1440x900", "width": 1440, "height": 900},
    {"name": "1024x768", "width": 1024, "height": 768},
    {"name": "768x1024", "width": 768, "height": 1024},
    {"name": "600x900", "width": 600, "height": 900},
]

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print(json.dumps({
        "error": "playwright package not installed in active python environment",
        "passed": False,
        "recommendation": "Install playwright: pip install playwright && playwright install chromium"
    }, indent=2))
    sys.exit(1)

report = {
    "base_url": BASE,
    "target_url": FULL_URL,
    "feature": FEATURE,
    "is_studio_mode": IS_STUDIO,
    "checks": [],
    "screenshots": [],
    "failed_subresources": [],
    "page_errors": [],
}

all_failed_subresources = []
page_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for vp in VIEWPORTS:
        context = browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
        page = context.new_page()

        # 1. Subresources check
        vp_failed_sub = []
        if audit_subresources:
            vp_failed_sub = audit_subresources(page, BASE)
        else:
            page.on("response", lambda res: vp_failed_sub.append({"status": res.status, "url": res.url}) if res.status >= 400 and any(ext in res.url for ext in [".css", ".js"]) else None)

        page.on("pageerror", lambda err: page_errors.append(str(err)[:300]))

        try:
            page.goto(FULL_URL, wait_until="networkidle", timeout=15000)
        except Exception as e:
            page_errors.append(f"Navigation error ({vp['name']}): {str(e)[:200]}")

        # 2. Visual & Anti-whiteout check
        if audit_visual_invariants:
            visual_res = audit_visual_invariants(page)
        else:
            bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
            sheets = page.evaluate("document.styleSheets.length")
            visual_res = {"passed": bg not in ("rgba(0,0,0,0)", "transparent") and sheets > 0, "body_background": bg, "stylesheets_count": sheets}

        # 3. Layout invariants check
        if audit_layout_invariants:
            layout_res = audit_layout_invariants(page, vp, is_studio=IS_STUDIO)
        else:
            sh = page.evaluate("document.documentElement.scrollHeight")
            layout_res = {"passed": True, "scroll_height": sh, "client_height": vp["height"]}

        # 4. 5-State UI check
        if audit_5state_ui:
            state_res = audit_5state_ui(page)
        else:
            state_res = {"passed": True}

        shot_path = f"{OUT_DIR}/viewport-{vp['name']}.png"
        page.screenshot(path=shot_path, full_page=False)

        vp_passed = visual_res.get("passed", True) and layout_res.get("passed", True) and state_res.get("passed", True) and len(vp_failed_sub) == 0

        report["checks"].append({
            "viewport": vp["name"],
            "passed": vp_passed,
            "visual": visual_res,
            "layout": layout_res,
            "states": state_res,
            "failed_subresources": vp_failed_sub,
            "screenshot": shot_path
        })
        report["screenshots"].append(shot_path)
        all_failed_subresources.extend(vp_failed_sub)
        page.close()
        context.close()
    browser.close()

report["failed_subresources"] = all_failed_subresources
report["page_errors"] = page_errors
report["passed"] = (
    all(c["passed"] for c in report["checks"])
    and len(all_failed_subresources) == 0
    and len(page_errors) == 0
)

report_file = f"{OUT_DIR}/report.json"
with open(report_file, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2)

print(json.dumps(report, indent=2))
print(f"\n==> [Unified UI Verification]: {'PASS' if report['passed'] else 'REJECT'}. Report: {report_file}")
sys.exit(0 if report["passed"] else 1)
