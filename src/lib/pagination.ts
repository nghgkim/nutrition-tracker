/** Pure pagination math for numbered page controls. */
export type PageToken = number | "…";

export function totalPages(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize);
}

/** Windowed page list: first/last page always visible, ellipsis for gaps. */
export function pageWindow(current: number, total: number, span = 2): PageToken[] {
  if (total <= 0) return [];
  if (total <= span * 2 + 3) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total]);
  for (let p = current - span; p <= current + span; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const tokens: PageToken[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) tokens.push("…");
    tokens.push(sorted[i]);
  }
  return tokens;
}
