/**
 * Applies an explicit price range to restaurant records.
 * A record without a known price cannot satisfy a user-set price bound.
 */
export interface PriceableRestaurant {
  priceMin?: number | null;
  priceMax?: number | null;
}

export function filterByPrice<T extends PriceableRestaurant>(
  restaurants: T[],
  minPrice: number | null,
  maxPrice: number | null
): T[] {
  return restaurants.filter(r => {
    if (minPrice != null && !(r.priceMax != null && r.priceMax >= minPrice)) return false;
    if (maxPrice != null && !(r.priceMin != null && r.priceMin <= maxPrice)) return false;
    return true;
  });
}
