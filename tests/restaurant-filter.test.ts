import { describe, it, expect } from "vitest";
import { filterByPrice, type PriceableRestaurant } from "@/lib/restaurant-filter";

type Item = PriceableRestaurant & { name: string };
const R = (name: string, priceMin: number | null, priceMax: number | null): Item =>
  ({ name, priceMin, priceMax });

describe("filterByPrice", () => {
  const list = [
    R("cheap", 15000, 25000),
    R("mid", 30000, 60000),
    R("expensive", 100000, 200000),
    R("unknown", null, null),
  ];

  it("excludes restaurants with no price when a max price is set", () => {
    expect(filterByPrice(list, null, 50000).map(r => r.name)).toEqual(["cheap", "mid"]);
  });

  it("excludes restaurants with no price when a min price is set", () => {
    expect(filterByPrice(list, 50000, null).map(r => r.name)).toEqual(["mid", "expensive"]);
  });

  it("combines both bounds using price-range overlap", () => {
    expect(filterByPrice(list, 20000, 50000).map(r => r.name)).toEqual(["cheap", "mid"]);
  });

  it("keeps every restaurant when no price filter is active", () => {
    expect(filterByPrice(list, null, null)).toHaveLength(4);
  });
});
