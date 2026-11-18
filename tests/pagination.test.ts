import { describe, it, expect } from "vitest";
import { totalPages, pageWindow, type PageToken } from "@/lib/pagination";

describe("pagination helpers", () => {
  it("computes total pages, including zero for an empty result", () => {
    expect(totalPages(23793, 9)).toBe(2644);
    expect(totalPages(18, 9)).toBe(2);
    expect(totalPages(0, 9)).toBe(0);
  });

  it("shows a window around the current page with ellipsis markers", () => {
    const tokens: PageToken[] = pageWindow(1, 2644, 2);
    expect(tokens).toEqual([1, 2, 3, "…", 2644]);
  });

  it("keeps the window bounded in the middle", () => {
    const tokens = pageWindow(100, 2644, 2);
    expect(tokens.filter(t => typeof t === "number").length).toBeLessThanOrEqual(7);
    expect(tokens).toContain(100);
    expect(tokens[0]).toBe(1);
    expect(tokens[tokens.length - 1]).toBe(2644);
  });

  it("lists every page without ellipsis when there are few", () => {
    expect(pageWindow(1, 3, 2)).toEqual([1, 2, 3]);
  });
});
