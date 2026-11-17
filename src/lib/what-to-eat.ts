// Pure recommendation logic — see docs/specs/what-to-eat.md
export interface Dish { name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; source: string; }
export interface Suggestion { dish: Dish; reason: string; }

export function suggestDishes(remaining: number, foods: Dish[], count = 3): Suggestion[] {
  if (remaining <= 0) return [];
  // pick dishes whose calories fit within remaining budget, prefer ~60-90% of it
  const eligible = foods
    .filter(f => f.calories > 0 && f.calories <= remaining)
    .sort((a, b) => {
      const sa = Math.abs(a.calories - remaining * 0.75);
      const sb = Math.abs(b.calories - remaining * 0.75);
      return sa - sb;
    });
  // take top candidates then shuffle for variety, keep deterministic-ish spread
  const pool = eligible.slice(0, 30);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(f => ({
    dish: f,
    reason: `${f.calories} kcal · còn ${Math.round(remaining - f.calories)} kcal trong ngày`,
  }));
}
