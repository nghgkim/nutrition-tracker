import { describe, it, expect } from "vitest";
import { buildWeeklyPlan, swapMeal, type MealDay } from "@/lib/meal-plan";
import type { Dish } from "@/lib/what-to-eat";

const dish = (name: string, calories: number, servingSize: string | null = "100g"): Dish => ({
  name, calories, servingSize, protein: 0, carbs: 0, fat: 0, source: "NIN2026",
});

describe("serving size propagation", () => {
  it("keeps servingSize on plan meals", () => {
    const week = buildWeeklyPlan([dish("Cơm gà", 500, "1 bát"), dish("Bún chả", 450, "1 phần")], 2000);
    expect(week[0].meals.some(m => m.servingSize === "1 bát" || m.servingSize === "1 phần")).toBe(true);
  });

  it("keeps null servingSize as null (no fabricated placeholder)", () => {
    const week = buildWeeklyPlan([dish("Cơm gà", 500, null), dish("Bún chả", 450, null)], 2000);
    expect(week[0].meals.every(m => m.servingSize === null)).toBe(true);
  });
});

describe("swapMeal", () => {
  const day: MealDay = {
    day: 0, label: "Thứ 2",
    meals: [
      { name: "Cơm gà", calories: 500, source: "NIN2026", servingSize: "1 bát" },
      { name: "Bún chả", calories: 450, source: "NIN2026", servingSize: "1 phần" },
      { name: "Phở bò", calories: 550, source: "NIN2026", servingSize: "1 bát" },
      { name: "Chè đậu", calories: 500, source: "NIN2026", servingSize: "1 ly" },
    ],
    total: 2000,
  };
  const candidates = [
    dish("Cơm tấm", 505, "1 đĩa"),
    dish("Gà nướng", 495, "1 phần"),
    dish("Bánh mì", 350, "1 ổ"),
    dish("Cơm gà", 500, "1 bát"), // already used
  ];

  it("picks the closest calorie alternative that is not already in the day", () => {
    const result = swapMeal(day, 0, candidates);
    expect(result.meals[0].name).toBe("Cơm tấm");
    expect(result.total).toBeGreaterThan(1900);
  });

  it("keeps all four meals and a unique set", () => {
    const result = swapMeal(day, 1, candidates);
    expect(result.meals).toHaveLength(4);
    expect(new Set(result.meals.map(m => m.name)).size).toBe(4);
  });

  it("keeps the original when no alternative exists", () => {
    const result = swapMeal(day, 0, []);
    expect(result).toEqual(day);
  });
});
