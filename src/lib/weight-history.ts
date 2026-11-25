/** Pure client-side paging for a user's own weight history. */
export interface WeightLog { id: string; weight: number; }

export function paginateLogs<T extends WeightLog>(logs: T[], page: number, pageSize = 7): {
  rows: T[];
  totalPages: number;
  page: number;
} {
  const totalPages = Math.ceil(logs.length / pageSize);
  if (totalPages === 0) return { rows: [], totalPages: 0, page: 1 };
  const safePage = Math.min(Math.max(page, 1), totalPages);
  return {
    rows: logs.slice((safePage - 1) * pageSize, safePage * pageSize),
    totalPages,
    page: safePage,
  };
}
