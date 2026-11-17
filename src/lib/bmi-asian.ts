// BMI classification per QĐ 2892/QĐ-BYT (22/10/2022), WHO Asian standard.
// Source: https://dulieuphapluat.vn/cong-cu/danh-gia-tinh-trang-dinh-duong.html
export interface BMIResult {
  bmi: number;
  category: string;
  color: string;
  waistAlert: string | null;
  source: string;
}

export function classifyBMI(bmi: number, gender: "male" | "female", waist?: number | null): BMIResult {
  let category = "Béo phì độ II", color = "text-rose-600";
  if (bmi < 18.5) { category = "Thiếu cân"; color = "text-blue-500"; }
  else if (bmi < 23) { category = "Bình thường"; color = "text-emerald-500"; }
  else if (bmi < 25) { category = "Thừa cân"; color = "text-amber-500"; }
  else if (bmi < 30) { category = "Béo phì độ I"; color = "text-orange-500"; }

  let waistAlert: string | null = null;
  if (waist != null) {
    const limit = gender === "male" ? 90 : 80;
    if (waist >= limit) waistAlert = `Vòng bụng ${waist}cm ≥ ${limit}cm — béo bụng (QĐ 2892)`;
  }
  return { bmi: Math.round(bmi * 10) / 10, category, color, waistAlert, source: "QĐ 2892/QĐ-BYT (WHO Châu Á)" };
}
