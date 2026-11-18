import { describe, it, expect } from "vitest";
import { RESTAURANT_ORDER, hasStableTieBreaker } from "@/lib/restaurant-order";

describe("restaurant pagination order", () => {
  it("sorts by rating desc then by a unique tie-breaker", () => {
    expect(RESTAURANT_ORDER).toEqual([{ rating: "desc" }, { id: "asc" }]);
  });

  it("treats a non-unique field as insufficient for stable offset paging", () => {
    expect(hasStableTieBreaker([{ rating: "desc" }])).toBe(false);
    expect(hasStableTieBreaker(RESTAURANT_ORDER)).toBe(true);
  });
});
