import { describe, it, expect } from "vitest";
import { normalizeInternetFoods, type RawInternetFood } from "@/lib/food-search-all";

describe("normalizeInternetFoods", () => {
  const raw: RawInternetFood = {
    name: "Bánh mì Orion",
    brand: "Orion",
    calories: 430, protein: 8, carbs: 70, fat: 12,
  };

  it("keeps per-100g values and tags the source", () => {
    const out = normalizeInternetFoods([raw], "Open Food Facts");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ calories: 430, protein: 8, servingSize: "100g", source: "Open Food Facts" });
  });

  it("maps missing nutrients to null, never 0", () => {
    const out = normalizeInternetFoods([{ name: "X", brand: null, calories: null, protein: null, carbs: null, fat: null }], "USDA-FDC");
    expect(out[0]).toMatchObject({ calories: null, protein: null, source: "USDA-FDC" });
  });

  it("drops rows without a name and dedupes by name+brand", () => {
    expect(normalizeInternetFoods([{ ...raw }, { ...raw }, { name: "", brand: null, calories: 1, protein: null, carbs: null, fat: null }], "Open Food Facts")).toHaveLength(1);
  });
});
