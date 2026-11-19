/**
 * Applies an explicit price range to restaurant records.
 * Bounds are strict: the whole price range must fit inside the requested range.
 * A record without a known price cannot satisfy a user-set price bound.
 */
export interface PriceableRestaurant {
  priceMin?: number | null;
  priceMax?: number | null;
}

/** Trim, dedupe and bound repeated district params before building an OR filter. */
export function normalizeDistricts(values: string[]): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    const name = value.trim();
    if (name) seen.add(name);
    if (seen.size >= 10) break;
  }
  return [...seen];
}

/** Clamp optional multi-criteria params from query strings. */
export function clampCriteria(
  minRatingRaw: string | null,
  maxDistanceRaw: string | null
): { minRating: number | null; maxDistance: number | null } {
  const read = (raw: string | null, max: number): number | null => {
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.min(value, max);
  };
  return { minRating: read(minRatingRaw, 10), maxDistance: read(maxDistanceRaw, 100) };
}

export function filterByPrice<T extends PriceableRestaurant>(
  restaurants: T[],
  minPrice: number | null,
  maxPrice: number | null
): T[] {
  return restaurants.filter(r => {
    if (minPrice != null && !(r.priceMin != null && r.priceMin >= minPrice)) return false;
    if (maxPrice != null && !(r.priceMax != null && r.priceMax <= maxPrice)) return false;
    return true;
  });
}
