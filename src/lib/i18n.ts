"use client";
import { createContext, useContext } from "react";

export type Locale = "vi" | "en";

export const dict: Record<string, Record<Locale, string>> = {
  dashboard: { vi: "Dashboard", en: "Dashboard" },
  foods: { vi: "Món ăn", en: "Foods" },
  history: { vi: "Lịch sử", en: "History" },
  profile: { vi: "Hồ sơ & Cân nặng", en: "Profile & Weight" },
  exercise: { vi: "Tập luyện", en: "Exercise" },
  finance: { vi: "Tài chính", en: "Finance" },
  family: { vi: "Gia đình", en: "Family" },
  settings: { vi: "Cài đặt", en: "Settings" },
  more: { vi: "Thêm", en: "More" },
  add: { vi: "Thêm", en: "Add" },
  logout: { vi: "Đăng xuất", en: "Log out" },
  login: { vi: "Đăng nhập", en: "Log in" },
  register: { vi: "Đăng ký", en: "Sign up" },
  overview: { vi: "Tổng quan", en: "Overview" },
  library: { vi: "Thư viện", en: "Library" },
  activity: { vi: "Hoạt động", en: "Activity" },
  manage: { vi: "Quản lý", en: "Manage" },
  community: { vi: "Cộng đồng", en: "Community" },
  total: { vi: "Tổng", en: "Total" },
  empty: { vi: "Chưa có dữ liệu", en: "No data yet" },
  search: { vi: "Tìm...", en: "Search..." },
  noData: { vi: "Chưa có dữ liệu", en: "No data yet" },
};

export function t(key: string, locale: Locale): string {
  return dict[key]?.[locale] ?? dict[key]?.vi ?? key;
}

export const LocaleContext = createContext<Locale>("vi");
export function useT() {
  const locale = useContext(LocaleContext);
  return (key: string) => t(key, locale);
}
