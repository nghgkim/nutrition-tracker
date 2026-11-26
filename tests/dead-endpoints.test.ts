import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const retired = [
  "src/app/api/foods/suggest/route.ts",
  "src/app/api/nutrition/bmi/route.ts",
  "src/app/api/nutrition/rich/route.ts",
  "src/app/api/budget/alerts/route.ts",
  "src/app/api/reminders/tick/route.ts",
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("retired feature guard", () => {
  it.each(retired)("no route file remains at %s", (relative) => {
    expect(existsSync(path.join(root, relative))).toBe(false);
  });

  it("no source file fetches a retired endpoint", () => {
    const needles = retired.map(p => `/api/${p.replace("src/app/api/", "").replace("/route.ts", "")}`);
    for (const file of sourceFiles(path.join(root, "src"))) {
      if (file.includes(`${path.sep}app${path.sep}api${path.sep}`)) continue;
      const code = readFileSync(file, "utf8");
      for (const needle of needles) expect(code).not.toContain(needle);
    }
  });

  it("middleware no longer exposes the retired cron tick", () => {
    const code = readFileSync(path.join(root, "src/middleware.ts"), "utf8");
    expect(code).not.toContain("/api/reminders/tick");
    expect(code).toContain("/api/auth");
  });

  it("nav keeps the theme toggle and drops empty scaffolding", () => {
    const code = readFileSync(path.join(root, "src/components/Nav.tsx"), "utf8");
    expect(code).not.toContain("const primary:");
    expect(code).not.toContain("items: []");
    expect(code).toContain("Chế độ tối");
  });
});
