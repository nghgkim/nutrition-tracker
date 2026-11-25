/** Normalizes internet food results to a per-100g shape with explicit provenance. */
export interface RawInternetFood {
  name: string;
  brand: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface NormalizedInternetFood {
  id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  servingSize: string;
  source: string;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : null;

export function normalizeInternetFoods(foods: RawInternetFood[], source: string): NormalizedInternetFood[] {
  const seen = new Set<string>();
  const out: NormalizedInternetFood[] = [];
  for (const food of foods) {
    const name = typeof food.name === "string" ? food.name.trim() : "";
    if (!name) continue;
    const key = `${name.toLowerCase()}|${(food.brand || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `${source}:${key}`,
      name: food.brand ? `${name} (${food.brand})` : name,
      calories: num(food.calories),
      protein: num(food.protein),
      carbs: num(food.carbs),
      fat: num(food.fat),
      servingSize: "100g",
      source,
    });
  }
  return out;
}
