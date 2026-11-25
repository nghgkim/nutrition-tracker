import { describe, it, expect } from "vitest";
import { paginateLogs } from "@/lib/weight-history";

const logs = Array.from({ length: 10 }, (_, i) => ({ id: String(i), weight: 70 - i }));

describe("paginateLogs", () => {
  it("returns newest-first slices of at most 7", () => {
    expect(paginateLogs(logs, 1, 7).rows.map(r => r.id)).toEqual(["0", "1", "2", "3", "4", "5", "6"]);
    expect(paginateLogs(logs, 2, 7).rows.map(r => r.id)).toEqual(["7", "8", "9"]);
  });

  it("reports total pages and clamps out-of-range pages", () => {
    expect(paginateLogs(logs, 1, 7).totalPages).toBe(2);
    expect(paginateLogs(logs, 9, 7).page).toBe(2);
    expect(paginateLogs(logs, 9, 7).rows.map(r => r.id)).toEqual(["7", "8", "9"]);
    expect(paginateLogs([], 1, 7)).toEqual({ rows: [], totalPages: 0, page: 1 });
  });
});
