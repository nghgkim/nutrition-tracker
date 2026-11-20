import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const sw = readFileSync(path.resolve(process.cwd(), "public/sw.js"), "utf-8");

describe("service worker cache & brand invariants", () => {
  it("uses a thuypn cache name, not the stale nutritrack one", () => {
    expect(sw).toMatch(/CACHE_NAME\s*=\s*["']thuypn-v\d+["']/);
    expect(sw).not.toContain("nutritrack-v3");
  });

  it("has no stale Nutrition Tracker brand string", () => {
    expect(sw).not.toContain("Nutrition Tracker");
    expect(sw).toContain("thuypn by kimnh");
  });

  it("opens the canonical home on notification click", () => {
    expect(sw).toContain('clients.openWindow("/")');
    expect(sw).not.toContain('clients.openWindow("/dashboard")');
  });

  it("keeps network-first HTML and old-cache deletion", () => {
    expect(sw).toContain('request.mode === "navigate"');
    expect(sw).toContain("caches.delete");
  });
});
