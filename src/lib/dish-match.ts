/**
 * Matches a NIN dish name to Foody restaurants by food-type keywords.
 * Only real Foody records are returned — no calories or dishes are invented.
 */
export interface MatchableRestaurant {
  name: string;
  url: string;
  rating: number;
  cuisines?: string | null;
}

const KEYWORDS = [
  "com", "bun", "pho", "banh", "chao", "lau", "hu tieu", "xoi",
  "ga", "vit", "cuon", "nuong", "chien", "kho", "sup", "dimsum",
  "dumsum", "che", "thit", "ca", "mi", "bo",
];
const MIN_SCORE = 2;

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function matchRestaurantsForDish<T extends MatchableRestaurant>(
  dishName: string,
  restaurants: T[],
  limit = 1
): T[] {
  const dish = normalize(dishName);
  const keys = KEYWORDS.filter(k => dish.includes(k)).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return [];
  // The dish's leading two-token signature is a much stronger signal than a
  // shared generic word such as "bún" or "mì".
  const bigram = dish.split(/\s+/).filter(Boolean).slice(0, 2).join(" ");

  return restaurants
    .map(restaurant => {
      const name = normalize(restaurant.name);
      const cuisines = normalize(restaurant.cuisines || "");
      const keywordScore = keys.reduce(
        (sum, key) => sum + (name.includes(key) ? key.length : 0) + (cuisines.includes(key) ? 1 : 0),
        0
      );
      const score = keywordScore + (bigram && name.includes(bigram) ? 10 : 0);
      return { restaurant, score };
    })
    .filter(entry => entry.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || b.restaurant.rating - a.restaurant.rating)
    .slice(0, limit)
    .map(entry => entry.restaurant);
}
