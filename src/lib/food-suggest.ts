/** Pure ranked lookup over trusted NIN foods. No estimation or fabrication. */
import { removeDiacritics } from "./normalize";

export interface SuggestFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string | null;
  source: string | null;
}

export function rankFoodMatches(foods: SuggestFood[], query: string, limit = 8): SuggestFood[] {
  const q = removeDiacritics(query.trim()).toLowerCase();
  if (!q) return [];
  const seen = new Set<string>();
  const scored: { food: SuggestFood; score: number }[] = [];
  for (const food of foods) {
    const name = removeDiacritics(food.name).toLowerCase();
    const key = name.trim();
    if (seen.has(key) || !name.includes(q)) continue;
    seen.add(key);
    const score = key === q ? 0 : name.startsWith(q) ? 1 : 2;
    scored.push({ food, score });
  }
  scored.sort((a, b) => a.score - b.score || a.food.name.localeCompare(b.food.name));
  return scored.slice(0, limit).map(x => x.food);
}

/** Prefill the add-food form from the user's own search query (not an estimate). */
export function prefillFoodName(query: string): string {
  return query.trim().slice(0, 60);
}
