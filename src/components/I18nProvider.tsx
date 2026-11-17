"use client";
import { useEffect, useState } from "react";
import { LocaleContext, type Locale } from "@/lib/i18n";

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("vi");
  useEffect(() => {
    const load = () => fetch("/api/locale").then(r => r.json()).then(d => setLocale(d.locale || "vi")).catch(() => {});
    load();
    window.addEventListener("localechange", load);
    return () => window.removeEventListener("localechange", load);
  }, []);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
