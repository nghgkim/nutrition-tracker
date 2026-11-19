/** Stable sort allowlist for restaurant paging; always ends with a unique key. */
export const RESTAURANT_SORTS = ["rating", "price", "distance"] as const;
export type RestaurantSort = (typeof RESTAURANT_SORTS)[number];

export function sortOrder(sort: string): { rating?: "desc"; priceMin?: "asc"; id?: "asc" }[] {
  if (sort === "price") return [{ priceMin: "asc" }, { id: "asc" }];
  // Distance is computed on the returned page (needs the user's coordinates);
  // DB order stays stable so paging never overlaps.
  return [{ rating: "desc" }, { id: "asc" }];
}
