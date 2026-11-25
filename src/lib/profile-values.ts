/** Null-safe numeric coercion for optional profile fields (never maps empty to 0). */
export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Validated positive weight in kg; null when missing or out of range. */
export function parseWeight(value: string): number | null {
  const n = toNullableNumber(value);
  return n != null && n > 0 && n < 500 ? n : null;
}
