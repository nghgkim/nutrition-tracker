/** Distance sort requires real coordinates; otherwise fall back to rating order. */
export function shouldSortByDistance(sort: string, hasGeo: boolean): boolean {
  return sort === "distance" && hasGeo;
}
