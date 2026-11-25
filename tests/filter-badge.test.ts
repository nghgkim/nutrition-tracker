import { describe, it, expect } from "vitest";
import { countActiveFilterValues, type FilterState } from "@/lib/filter-badge";

const base: FilterState = {
  districts: [], minPrice: "", maxPrice: "", minRating: "", maxDistance: "", sort: "rating",
};

describe("countActiveFilterValues", () => {
  it("returns 0 for defaults", () => {
    expect(countActiveFilterValues(base)).toBe(0);
  });

  it("counts each selected district as one value", () => {
    expect(countActiveFilterValues({ ...base, districts: ["Quận 1", "Quận 3", "Quận 5"] })).toBe(3);
  });

  it("adds scalar filters and a non-default sort", () => {
    expect(countActiveFilterValues({
      ...base,
      districts: ["Quận 1", "Quận 3"],
      minPrice: "20000",
      minRating: "8",
      sort: "price",
    })).toBe(5);
  });

  it("treats empty strings as inactive", () => {
    expect(countActiveFilterValues({ ...base, districts: [], maxPrice: "", maxDistance: "" })).toBe(0);
  });

  it("counts a selected source filter as one active value", () => {
    expect(countActiveFilterValues({ ...base, source: "Google" })).toBe(1);
  });
});
