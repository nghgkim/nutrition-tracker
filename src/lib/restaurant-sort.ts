/** Stable sort allowlist for restaurant paging; always ends with a unique key. */
export const RESTAURANT_SORTS = ["rating", "price", "distance"] as const;
export type RestaurantSort = (typeof RESTAURANT_SORTS)[number];

export function sortOrder(sort: string): { rating?: "desc"; priceMin?: "asc"; id?: "asc" }[] {
  if (sort === "price") return [{ priceMin: "asc" }, { id: "asc" }];
  // Equal ratings fall back to the cheapest venue; id keeps paging stable.
  return [{ rating: "desc" }, { priceMin: "asc" }, { id: "asc" }];
}
