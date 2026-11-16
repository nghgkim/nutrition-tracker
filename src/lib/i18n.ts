export type Locale = "vi" | "en";

const dict: Record<string, Record<Locale, string>> = {
  dashboard: { vi: "Dashboard", en: "Dashboard" },
  foods: { vi: "Món ăn", en: "Foods" },
  history: { vi: "Lịch sử", en: "History" },
  profile: { vi: "Hồ sơ & Cân nặng", en: "Profile & Weight" },
  exercise: { vi: "Tập luyện", en: "Exercise" },
  finance: { vi: "Tài chính", en: "Finance" },
  family: { vi: "Gia đình", en: "Family" },
  settings: { vi: "Cài đặt", en: "Settings" },
  add: { vi: "Thêm", en: "Add" },
  more: { vi: "Thêm", en: "More" },
  logout: { vi: "Đăng xuất", en: "Log out" },
  login: { vi: "Đăng nhập", en: "Log in" },
  register: { vi: "Đăng ký", en: "Sign up" },
  total: { vi: "Tổng", en: "Total" },
  empty: { vi: "Chưa có dữ liệu", en: "No data yet" },
};

export function t(key: string, locale: Locale): string {
  return dict[key]?.[locale] ?? dict[key]?.vi ?? key;
}
