/** Pure normalization of user-selected price bounds before hitting Prisma. */
export interface PriceRange {
  minPrice: number | null;
  maxPrice: number | null;
}

function parse(value: string): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function normalizePriceRange(min: string, max: string): PriceRange {
  let minPrice = parse(min);
  let maxPrice = parse(max);
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  return { minPrice, maxPrice };
}
