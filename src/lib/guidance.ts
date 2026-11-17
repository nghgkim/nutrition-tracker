// Guidance data with authoritative sources (see docs/specs/ux-content-fix.md §6)
export interface ExerciseSuggestion {
  name: string;
  sets: string;
  reps: string;
  duration?: string;
  note: string;
  source: string;
}

export const EXERCISE_SUGGESTIONS: Record<string, ExerciseSuggestion[]> = {
  "giảm cân": [
    { name: "Chạy bộ nhanh (brisk walking/jogging)", sets: "3-5 buổi/tuần", reps: "20-30 phút", note: "Aerobic vừa phải, đốt calo bền vững", source: "WHO 2020; ACSM" },
    { name: "Tập sức mạnh toàn thân (squat, plank, push-up)", sets: "2-3 buổi/tuần", reps: "3 hiệp × 10-12 cái", note: "Giữ cơ, tăng trao đổi chất", source: "ACSM" },
    { name: "Đạp xe / Bơi", sets: "2 buổi/tuần", reps: "30-45 phút", note: "Ít tác động khớp, phù hợp người thừa cân", source: "ACSM" },
  ],
  "tăng cơ": [
    { name: "Squat / Deadlift", sets: "3 buổi/tuần", reps: "4 hiệp × 6-8 cái", note: "Compound lifts, tăng khối cơ", source: "ACSM" },
    { name: "Push-up / Bench press", sets: "2-3 buổi/tuần", reps: "4 hiệp × 8-10 cái", note: "Ngực - tay - vai", source: "ACSM" },
    { name: "Plank / Core", sets: "3 buổi/tuần", reps: "3 hiệp × 30-60s", note: "Ổn định core", source: "ACSM" },
  ],
  "duy trì": [
    { name: "Đi bộ nhanh", sets: "5 buổi/tuần", reps: "30 phút", note: "Duy trì sức khỏe tim mạch", source: "WHO 2020" },
    { name: "Tập sức mạnh nhẹ", sets: "2 buổi/tuần", reps: "2 hiệp × 12 cái", note: "Duy trì khối cơ", source: "ACSM" },
    { name: "Yoga / Giãn cơ", sets: "2 buổi/tuần", reps: "20-30 phút", note: "Linh hoạt, giảm stress", source: "WHO 2020" },
  ],
} as Record<string, ExerciseSuggestion[]>;

// Meal distribution per NIN Vietnam school-meal guidance (viendinhduong.vn)
export const MEAL_RATIO = [
  { meal: "Bữa sáng", ratio: 0.275, icon: "🌅" },
  { meal: "Bữa trưa", ratio: 0.35, icon: "☀️" },
  { meal: "Bữa xế", ratio: 0.075, icon: "🍎" },
  { meal: "Bữa tối", ratio: 0.275, icon: "🌙" },
  { meal: "Tráng miệng", ratio: 0.025, icon: "🍮" },
];

export function buildMealPlan(target: number) {
  return MEAL_RATIO.map((m) => ({ ...m, calories: Math.round(target * m.ratio) }));
}
