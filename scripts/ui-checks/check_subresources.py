#!/usr/bin/env python3
"""
Module 1: Subresource & Network Audit
Verifies that all critical assets (CSS, JS, Fonts, Images) load successfully (no 403/429/500).
Catches whiteout / unstyled document regressions.
"""
import sys, json

def audit_subresources(page, base_url):
    failed = []
    
    def on_response(res):
        if res.status >= 400:
            url = res.url
            if any(ext in url for ext in [".css", ".js", ".woff", ".woff2", ".ttf", ".svg", ".png", ".jpg", ".webp"]):
                failed.append({
                    "status": res.status,
                    "url": url,
                    "content_type": res.headers.get("content-type", "")
                })
                
    page.on("response", on_response)
    return failed

if __name__ == "__main__":
    print("check_subresources module ready.")
