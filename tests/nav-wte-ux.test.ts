import { describe, it, expect } from "vitest";
import { createGenerationGuard } from "@/lib/request-guard";
import { todayPlanIndex, selectDayMeals, type MealDay } from "@/lib/meal-plan";

describe("request generation guard", () => {
  it("accepts only the newest generation", () => {
    const guard = createGenerationGuard();
    const first = guard.next();
    const second = guard.next();
    const third = guard.next();
    expect(guard.isLatest(first)).toBe(false);
    expect(guard.isLatest(second)).toBe(false);
    expect(guard.isLatest(third)).toBe(true);
  });

  it("starts at generation zero with no latest request", () => {
    const guard = createGenerationGuard();
    expect(guard.isLatest(0)).toBe(true);
    expect(guard.next()).toBe(1);
  });
});

describe("meal plan day selection", () => {
  const plan: MealDay[] = [
    { day: 0, label: "Thứ 2", total: 100, meals: [{ name: "A", calories: 40, source: "NIN2026", servingSize: null }, { name: "B", calories: 60, source: "NIN2026", servingSize: null }] },
    { day: 1, label: "Thứ 3", total: 70, meals: [{ name: "C", calories: 70, source: "NIN2026", servingSize: null }, { name: "—", calories: 0, source: "", servingSize: null }] },
    { day: 2, label: "Thứ 4", total: 90, meals: [{ name: "D", calories: 90, source: "NIN2026", servingSize: null }] },
  ];

  it("maps JS weekday (0=Sunday) to Monday-based plan index", () => {
    expect(todayPlanIndex(new Date("2026-11-16T12:00:00Z"))).toBe(0); // Monday
    expect(todayPlanIndex(new Date("2026-11-18T12:00:00Z"))).toBe(2); // Wednesday
    expect(todayPlanIndex(new Date("2026-11-22T12:00:00Z"))).toBe(6); // Sunday
  });

  it("selects only the requested day and drops empty slots", () => {
    const meals = selectDayMeals(plan, 1);
    expect(meals).toEqual([{ name: "C", calories: 70, source: "NIN2026", servingSize: null }]);
    expect(meals.reduce((s, m) => s + m.calories, 0)).toBe(70);
  });

  it("returns an empty array for an unknown day", () => {
    expect(selectDayMeals(plan, 6)).toEqual([]);
  });
});
