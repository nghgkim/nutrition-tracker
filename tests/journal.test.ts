import { describe, it, expect } from "vitest";
import { monthRange, journalStats, normalizeTags, type JournalEntry } from "@/lib/journal";

describe("monthRange", () => {
  it("returns inclusive UTC bounds for a year/month", () => {
    expect(monthRange(2026, 11)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(monthRange(2024, 2)).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });
});

describe("normalizeTags", () => {
  it("trims, dedupes case-insensitively and caps at 5 tags of 20 chars", () => {
    expect(normalizeTags([" gym ", "GYM", "work", "", "a".repeat(25), "b", "c", "d", "e", "f"]))
      .toEqual(["gym", "work", "a".repeat(20), "b", "c"]);
  });

  it("handles non-array input", () => {
    expect(normalizeTags(null)).toEqual([]);
  });
});

describe("journalStats", () => {
  const entries: JournalEntry[] = [
    { id: "1", date: "2026-11-02", note: "", mood: "😊 Tốt", energy: 8, tags: ["gym"] },
    { id: "2", date: "2026-11-05", note: "", mood: "😊 Tốt", energy: 6, tags: [] },
    { id: "3", date: "2026-11-09", note: "", mood: "😴 Mệt", energy: 3, tags: null },
  ];

  it("counts mood distribution and averages energy from real entries only", () => {
    const stats = journalStats(entries);
    expect(stats.total).toBe(3);
    expect(stats.byMood["😊 Tốt"]).toBe(2);
    expect(stats.byMood["😴 Mệt"]).toBe(1);
    expect(stats.avgEnergy).toBeCloseTo(5.67, 1);
  });

  it("returns zeros for no entries", () => {
    expect(journalStats([])).toMatchObject({ total: 0, avgEnergy: 0, byMood: {} });
  });
});

import { journalCorrelation, type CalorieLog } from "@/lib/journal";

describe("journalCorrelation", () => {
  const logs: CalorieLog[] = [
    { date: "2026-11-02", calories: 2000 },
    { date: "2026-11-02", calories: 500 },
    { date: "2026-11-05", calories: 1800 },
    { date: "2026-11-09", calories: 1200 },
  ];
  const entries: JournalEntry[] = [
    { id: "1", date: "2026-11-02", note: "", mood: "😊 Tốt", energy: 8, tags: ["gym"] },
    { id: "2", date: "2026-11-05", note: "", mood: "😊 Tốt", energy: 6, tags: [] },
    { id: "3", date: "2026-11-09", note: "", mood: "😴 Mệt", energy: 3, tags: null },
  ];

  it("averages real intake per mood, summing multiple logs on the same day", () => {
    const result = journalCorrelation(entries, logs);
    expect(result.find(r => r.mood === "😊 Tốt")).toMatchObject({ count: 2, avgKcal: 2150 });
    expect(result.find(r => r.mood === "😴 Mệt")).toMatchObject({ count: 1, avgKcal: 1200 });
  });

  it("reports zero kcal for moods with no logs (no fabricated value)", () => {
    const result = journalCorrelation([{ ...entries[0], id: "4", date: "2026-11-04" }], logs);
    expect(result[0]).toMatchObject({ count: 1, avgKcal: 0 });
  });

  it("returns an empty list when there are no entries", () => {
    expect(journalCorrelation([], logs)).toEqual([]);
  });
});
