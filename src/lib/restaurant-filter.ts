/**
 * Applies an explicit price range to restaurant records.
 * Bounds are strict: the whole price range must fit inside the requested range.
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
    if (minPrice != null && !(r.priceMin != null && r.priceMin >= minPrice)) return false;
    if (maxPrice != null && !(r.priceMax != null && r.priceMax <= maxPrice)) return false;
    return true;
  });
}
