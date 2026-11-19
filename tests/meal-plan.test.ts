import { describe, it, expect } from "vitest";
import { buildWeeklyPlan, type MealDay } from "@/lib/meal-plan";
import type { Dish } from "@/lib/what-to-eat";

const dish = (name: string, calories: number): Dish => ({
  name, calories, protein: 0, carbs: 0, fat: 0, servingSize: null, source: "NIN2026",
});

// Realistic pool: staple dishes around 300-700 kcal.
const pool: Dish[] = [
  dish("Cơm gà", 500), dish("Bún chả", 450), dish("Phở bò", 430),
  dish("Bánh mì", 350), dish("Cơm tấm", 550), dish("Chè đậu", 300),
  dish("Gà nướng", 480), dish("Cá kho", 520), dish("Rau luộc", 250),
  dish("Xôi gà", 560), dish("Mì xào", 610), dish("Súp gà", 330),
  dish("Bún bò", 470), dish("Cơm rang", 580), dish("Bánh cuốn", 380),
  dish("Trứng chiên", 290), dish("Thịt nướng", 640), dish("Canh chua", 260),
];

describe("buildWeeklyPlan", () => {
  it("keeps every day within +/-10% of the target", () => {
    const week = buildWeeklyPlan(pool, 2000);
    for (const day of week) {
      expect(Math.abs(day.total - 2000)).toBeLessThanOrEqual(200);
    }
  });

  it("selects 4 distinct meals per day", () => {
    const week = buildWeeklyPlan(pool, 2000);
    for (const day of week) {
      expect(day.meals).toHaveLength(4);
      expect(new Set(day.meals.map(m => m.name)).size).toBe(4);
    }
  });

  it("varies meals across days", () => {
    const week = buildWeeklyPlan(pool, 2000);
    const signatures = new Set(week.map(d => d.meals.map(m => m.name).join("|")));
    expect(signatures.size).toBeGreaterThan(1);
  });

  it("adapts to a different target", () => {
    const week: MealDay[] = buildWeeklyPlan(pool, 1600);
    for (const day of week) {
      expect(Math.abs(day.total - 1600)).toBeLessThanOrEqual(160);
    }
  });
});
