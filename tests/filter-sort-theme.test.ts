import { describe, it, expect } from "vitest";
import { normalizePriceRange, type PriceRange } from "@/lib/price-range";
import { RESTAURANT_SORTS, sortOrder, type RestaurantSort } from "@/lib/restaurant-sort";

describe("normalizePriceRange", () => {
  it("keeps a valid range", () => {
    expect(normalizePriceRange("20000", "50000")).toEqual({ minPrice: 20000, maxPrice: 50000 });
  });

  it("ignores empty bounds independently", () => {
    expect(normalizePriceRange("", "50000")).toEqual({ minPrice: null, maxPrice: 50000 });
    expect(normalizePriceRange("20000", "")).toEqual({ minPrice: 20000, maxPrice: null });
  });

  it("clamps a reversed range instead of emitting a negative query", () => {
    expect(normalizePriceRange("50000", "20000")).toEqual({ minPrice: 20000, maxPrice: 50000 });
  });

  it("ignores NaN and negative values", () => {
    const r: PriceRange = normalizePriceRange("abc", "-5");
    expect(r.minPrice).toBeNull();
    expect(r.maxPrice).toBeNull();
  });
});

describe("sortOrder", () => {
  it("exposes rating, price and distance", () => {
    expect(RESTAURANT_SORTS).toEqual(["rating", "price", "distance"]);
  });

  it("always ends with a unique tie-breaker", () => {
    expect(sortOrder("rating")).toEqual([{ rating: "desc" }, { id: "asc" }]);
    expect(sortOrder("price")).toEqual([{ priceMin: "asc" }, { id: "asc" }]);
    expect(sortOrder("distance" as RestaurantSort)).toEqual([{ rating: "desc" }, { id: "asc" }]);
  });

  it("falls back to rating for unknown values", () => {
    expect(sortOrder("bogus" as RestaurantSort)).toEqual(sortOrder("rating"));
  });
});
