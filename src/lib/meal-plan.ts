import type { Dish } from "./what-to-eat";
export interface MealDay { day: number; label: string; meals: { name: string; calories: number; source: string; servingSize: string | null }[]; total: number; }
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
  const base = foods
    .filter(f => f.calories > 100 && f.calories < 900 && f.source.includes("NIN2026"))
    .sort((a, b) => a.calories - b.calories);
  if (base.length === 0) {
    return LABELS.map((label, i) => ({ day: i, label, meals: [0,1,2,3].map(() => ({ name: "—", calories: 0, source: "", servingSize: null })), total: 0 }));
  }

  return LABELS.map((label, day) => {
    // Rotate the pool per day so the week is not seven identical days; the
    // small deterministic offset keeps selection reproducible.
    const pool = [...base.slice(day % base.length), ...base.slice(0, day % base.length)];
    const used = new Set<number>();
    let remaining = target;
    const picks = [0, 1, 2, 3].map(slot => {
      const slotsLeft = 4 - slot;
      const ideal = remaining / slotsLeft;
      let bestIndex = -1;
      let bestScore = Infinity;
      pool.forEach((f, idx) => {
        if (used.has(idx)) return;
        // Smaller deterministic noise rotates candidates per day for variety,
        // but stays far below calorie gaps so the total still hits the target.
        const noise = ((idx * 7 + day * 13 + slot * 3) % 21) - 10;
        const score = Math.abs(f.calories - ideal) + Math.abs(noise);
        if (score < bestScore) { bestScore = score; bestIndex = idx; }
      });
      if (bestIndex < 0) return { name: "—", calories: 0, source: "", servingSize: null };
      used.add(bestIndex);
      const f = pool[bestIndex];
      remaining -= f.calories;
      return { name: f.name, calories: Math.round(f.calories), source: f.source, servingSize: f.servingSize ?? null };
    });
    return { day, label, meals: picks, total: picks.reduce((s, m) => s + m.calories, 0) };
  });
}

/** Replace one slot with the closest-calorie food not already used that day. */
export function swapMeal(day: MealDay, slotIndex: number, candidates: Dish[]): MealDay {
  const original = day.meals[slotIndex];
  if (!original || candidates.length === 0) return day;
  const used = new Set(day.meals.filter((_, i) => i !== slotIndex).map(m => m.name));
  const options = candidates.filter(f => !used.has(f.name) && f.name !== original.name);
  if (options.length === 0) return day;
  const best = options.reduce((a, b) =>
    Math.abs(b.calories - original.calories) < Math.abs(a.calories - original.calories) ? b : a
  );
  const meals = day.meals.map((m, i) => i === slotIndex
    ? { name: best.name, calories: Math.round(best.calories), source: best.source, servingSize: best.servingSize ?? null }
    : m
  );
  return { ...day, meals, total: meals.reduce((sum, m) => sum + m.calories, 0) };
}
