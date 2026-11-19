/** Count user-visible filter values for the badge (each district counts as one). */
export interface FilterState {
  districts: string[];
  minPrice: string;
  maxPrice: string;
  minRating: string;
  maxDistance: string;
  sort: string;
}

export function countActiveFilterValues(filters: FilterState): number {
  const scalars = [filters.minPrice, filters.maxPrice, filters.minRating, filters.maxDistance]
    .filter(value => value !== "").length;
  const sortValue = filters.sort === "rating" ? 0 : 1;
  return filters.districts.length + scalars + sortValue;
}
