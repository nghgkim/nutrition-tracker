// Recommended daily calories by age group / gender / activity level.
// Source: Bảng nhu cầu dinh dưỡng khuyến nghị 2026 (dulieuphapluat.vn),
// based on NIN Vietnam. Regenerate: python3 scripts/scrape-nutrition-needs.py
export type Activity = "light" | "moderate" | "heavy";
export type Gender = "male" | "female";
export interface Needs { calories: number; source: string; }

export const AGE_LABELS: Record<string, string> = {
  "0-5-thang": "0 5 tháng",
  "6-8-thang": "6 8 tháng",
  "9-11-thang": "9 11 tháng",
  "1-2-tuoi": "1 2 tuổi",
  "3-5-tuoi": "3 5 tuổi",
  "6-7-tuoi": "6 7 tuổi",
  "8-9-tuoi": "8 9 tuổi",
  "10-11-tuoi": "10 11 tuổi",
  "12-14-tuoi": "12 14 tuổi",
  "15-17-tuoi": "15 17 tuổi",
  "18-29-tuoi": "18 29 tuổi",
  "30-49-tuoi": "30 49 tuổi",
  "50-64-tuoi": "50 64 tuổi",
  "65-74-tuoi": "65 74 tuổi",
  "75-tuoi": "75 tuổi",
};

export const NEEDS: Record<string, Record<Gender, Partial<Record<Activity, number>>>> = {
  "0-5-thang": { male: {"moderate": 550.0}, female: {} },
  "6-8-thang": { male: {"moderate": 650.0}, female: {} },
  "9-11-thang": { male: {"moderate": 700.0}, female: {} },
  "1-2-tuoi": { male: {"moderate": 1000.0}, female: {} },
  "3-5-tuoi": { male: {"moderate": 1300.0}, female: {} },
  "6-7-tuoi": { male: {"light": 1360.0, "moderate": 1570.0, "heavy": 1770.0}, female: {} },
  "8-9-tuoi": { male: {"light": 1600.0, "moderate": 1820.0, "heavy": 2050.0}, female: {"light": 1510.0, "moderate": 1730.0, "heavy": 1940.0} },
  "10-11-tuoi": { male: {"light": 1880.0, "moderate": 2150.0, "heavy": 2400.0}, female: {"light": 1740.0, "moderate": 1980.0, "heavy": 2220.0} },
  "12-14-tuoi": { male: {"light": 2200.0, "moderate": 2500.0, "heavy": 2790.0}, female: {"light": 2040.0, "moderate": 2310.0, "heavy": 2580.0} },
  "15-17-tuoi": { male: {"light": 2500.0, "moderate": 2820.0, "heavy": 3140.0}, female: {"light": 2110.0, "moderate": 2380.0, "heavy": 2650.0} },
  "18-29-tuoi": { male: {"light": 2205.0, "moderate": 2570.0, "heavy": 2940.0}, female: {"light": 1760.0, "moderate": 2050.0, "heavy": 2340.0} },
  "30-49-tuoi": { male: {"light": 2040.0, "moderate": 2380.0, "heavy": 2720.0}, female: {"light": 1740.0, "moderate": 2030.0, "heavy": 2320.0} },
  "50-64-tuoi": { male: {"light": 2025.0, "moderate": 2360.0, "heavy": 2700.0}, female: {"light": 1700.0, "moderate": 1980.0, "heavy": 2260.0} },
  "65-74-tuoi": { male: {"light": 1885.0, "moderate": 2210.0, "heavy": 2535.0}, female: {"light": 1550.0, "moderate": 1820.0, "heavy": 2090.0} },
  "75-tuoi": { male: {"light": 1810.0, "moderate": 2130.0}, female: {"light": 1500.0, "moderate": 1765.0} },
};

export function recommendedCalories(age: number | null, gender: Gender, activity: Activity): Needs {
  const key = age === null ? "18-29-tuoi"
    : age < 0.5 ? "0-5-thang" : age < 0.75 ? "6-8-thang" : age < 1 ? "9-11-thang"
    : age < 3 ? "1-2-tuoi" : age < 6 ? "3-5-tuoi" : age < 8 ? "6-7-tuoi"
    : age < 10 ? "8-9-tuoi" : age < 12 ? "10-11-tuoi" : age < 15 ? "12-14-tuoi"
    : age < 18 ? "15-17-tuoi" : age < 30 ? "18-29-tuoi" : age < 50 ? "30-49-tuoi"
    : age < 65 ? "50-64-tuoi" : age < 75 ? "65-74-tuoi" : "75-tuoi";
  const group = NEEDS[key];
  const value = group?.[gender]?.[activity]
    ?? group?.[gender]?.moderate
    ?? Object.values(group?.[gender] ?? {})[0]
    ?? 2000;
  return { calories: Math.round(value), source: `NIN 2026 — ${AGE_LABELS[key]}` };
}
