/** Stable order for offset pagination; rating alone ties across many venues. */
export const RESTAURANT_ORDER = [{ rating: "desc" }, { id: "asc" }] as const;

/** Offset paging is only stable when a unique key breaks ties. */
export function hasStableTieBreaker(order: ReadonlyArray<{ rating?: string; id?: string }>): boolean {
  return order.some(clause => clause.id != null);
}
