import { describe, it, expect } from "vitest";
import { rankFoodMatches, type SuggestFood } from "@/lib/food-suggest";

const foods: SuggestFood[] = [
  { id: "1", name: "Cơm gà", calories: 500, protein: 30, carbs: 60, fat: 15, servingSize: "1 bát", source: "NIN2026" },
  { id: "2", name: "Cơm rang", calories: 580, protein: 20, carbs: 80, fat: 18, servingSize: "1 đĩa", source: "NIN2026" },
  { id: "3", name: "Bún chả", calories: 450, protein: 25, carbs: 55, fat: 12, servingSize: "1 phần", source: "NIN2026" },
];

describe("rankFoodMatches", () => {
  it("ranks exact match first, then prefix, then substring", () => {
    const out = rankFoodMatches(foods, "cơm", 8);
    expect(out.map(f => f.name)).toEqual(["Cơm gà", "Cơm rang"]);
  });

  it("is accent-insensitive and caps results", () => {
    expect(rankFoodMatches(foods, "com", 1).map(f => f.name)).toEqual(["Cơm gà"]);
    expect(rankFoodMatches(foods, "m", 2).length).toBeLessThanOrEqual(2);
  });

  it("returns nothing for an empty query", () => {
    expect(rankFoodMatches(foods, "", 8)).toEqual([]);
  });
});
