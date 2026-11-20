/** Pure helpers for the standalone mood journal. */
export interface JournalEntry {
  id: string;
  date: string;
  note: string | null;
  mood: string | null;
  energy: number | null;
  tags: string[] | null;
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { from, to };
}

export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().slice(0, 20);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
    if (out.length >= 5) break;
  }
  return out;
}

export function journalStats(entries: JournalEntry[]): {
  total: number;
  avgEnergy: number;
  byMood: Record<string, number>;
} {
  const byMood: Record<string, number> = {};
  let energySum = 0;
  let energyCount = 0;
  for (const entry of entries) {
    if (entry.mood) byMood[entry.mood] = (byMood[entry.mood] || 0) + 1;
    if (entry.energy != null) { energySum += entry.energy; energyCount++; }
  }
  return {
    total: entries.length,
    avgEnergy: energyCount ? Math.round((energySum / energyCount) * 100) / 100 : 0,
    byMood,
  };
}
