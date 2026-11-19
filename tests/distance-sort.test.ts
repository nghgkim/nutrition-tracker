import { describe, it, expect } from "vitest";
import { shouldSortByDistance } from "@/lib/distance-sort";

describe("shouldSortByDistance", () => {
  it("uses global distance sort only when requested and coordinates exist", () => {
    expect(shouldSortByDistance("distance", true)).toBe(true);
  });

  it("falls back when geolocation is absent", () => {
    expect(shouldSortByDistance("distance", false)).toBe(false);
  });

  it("never applies distance for other sorts", () => {
    expect(shouldSortByDistance("rating", true)).toBe(false);
    expect(shouldSortByDistance("price", true)).toBe(false);
  });
});
