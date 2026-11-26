/** Request-boundary validation helpers shared by API route handlers. */

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export function parsePositiveNumber(
  value: unknown,
  { min = 0, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number } = {},
): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
}

export function parseDay(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function normalizeMealType(value: unknown): MealType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return (MEAL_TYPES as readonly string[]).includes(normalized)
    ? (normalized as MealType)
    : null;
}

export function monthBounds(month: string): { start: Date; end: Date } | null {
  const match = month.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) return null;
  return {
    start: new Date(year, monthNumber - 1, 1),
    end: new Date(year, monthNumber, 1),
  };
}

export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
