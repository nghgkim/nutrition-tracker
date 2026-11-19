import { describe, it, expect } from "vitest";
import { isNavActive } from "@/lib/nav-active";

describe("isNavActive", () => {
  it("highlights the exact route only", () => {
    expect(isNavActive("/what-to-eat", "/what-to-eat")).toBe(true);
    expect(isNavActive("/foods", "/what-to-eat")).toBe(false);
    expect(isNavActive("/", "/what-to-eat")).toBe(false);
  });

  it("highlights the parent for nested routes", () => {
    expect(isNavActive("/foods/123", "/foods")).toBe(true);
  });

  it("never highlights on the homepage for the food link", () => {
    expect(isNavActive("/", "/what-to-eat")).toBe(false);
    expect(isNavActive("/", "/foods")).toBe(false);
  });
});
