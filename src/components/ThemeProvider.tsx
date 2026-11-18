"use client";
import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  function apply(isDark: boolean) {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    root.style.background = isDark ? "#09090b" : "#f8fafc";
    if (document.body) document.body.style.background = isDark ? "#09090b" : "#f8fafc";
  }

  useLayoutEffect(() => {
    const stored = localStorage.getItem("nt-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDark(isDark);
    apply(isDark);
    setMounted(true);
  }, []);

  // Re-apply on EVERY client-side navigation — fixes the light flash on tab switch
  useEffect(() => { if (mounted) apply(dark); }, [pathname, mounted, dark]);

  function toggle() {
    const next = !dark;
    setDark(next);
    apply(next);
    localStorage.setItem("nt-theme", next ? "dark" : "light");
  }

  return (
    <>
      {children}
      <button onClick={toggle} aria-label="Toggle theme"
        className="fixed bottom-6 left-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all hover:scale-110 active:scale-95">
        {mounted && (dark ? <SunIcon /> : <MoonIcon />)}
      </button>
    </>
  );
}
function MoonIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }
function SunIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>; }
