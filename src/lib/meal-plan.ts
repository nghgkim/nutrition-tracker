import type { Dish } from "./what-to-eat";
export interface MealDay { day: number; label: string; meals: { name: string; calories: number; source: string }[]; total: number; }
type PlanMeal = MealDay["meals"][number];
const LABELS = ["Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ nhật"];

/** JS getDay() is Sunday-based; the weekly plan is Monday-based (index 0). */
export function todayPlanIndex(now: Date = new Date()): number {
  return (now.getDay() + 6) % 7;
}

/** Only meals belonging to the requested day; empty placeholders are dropped. */
export function selectDayMeals(plan: MealDay[], dayIndex: number): PlanMeal[] {
  const day = plan.find(d => d.day === dayIndex);
  return day ? day.meals.filter(m => m.name !== "—") : [];
}
export function buildWeeklyPlan(foods: Dish[], target: number): MealDay[] {
  const pool = foods.filter(f => f.calories > 100 && f.calories < 900 && f.source.includes("NIN2026"));
  const perMeal = Math.round(target / 4);
  return LABELS.map((label, i) => {
    const picks = [0,1,2,3].map(j => {
      const candidates = pool.filter(f => Math.abs(f.calories - perMeal) < 300);
      const f = candidates[(i * 4 + j) % Math.max(1, candidates.length)] || pool[(i*4+j) % Math.max(1,pool.length)];
      return f ? { name: f.name, calories: Math.round(f.calories), source: f.source } : { name: "—", calories: 0, source: "" };
    });
    return { day: i, label, meals: picks, total: picks.reduce((s,m)=>s+m.calories,0) };
  });
}
