"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Salad, LogOut, LayoutDashboard, Utensils, ChevronDown, Scale, Calculator, Settings, LogIn, UserPlus, History } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  if (pathname === "/login" || pathname === "/register") return null;

  const primary = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/foods", label: "Món ăn", icon: Utensils },
  ];
  const secondary = [
    { href: "/history", label: "Lịch sử", icon: History },
    { href: "/weight", label: "Cân nặng", icon: Scale },
    { href: "/calculator", label: "Tính calo", icon: Calculator },
    { href: "/settings", label: "Cài đặt", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground tracking-tight shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Salad className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">Nutrition Tracker</span>
        </Link>
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              {primary.map((l) => {
                const Icon = l.icon;
                const active = pathname === l.href;
                return (
                  <Link key={l.href} href={l.href}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}>
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{l.label}</span>
                  </Link>
                );
              })}
              <div className="relative" ref={moreRef}>
                <button onClick={() => setMoreOpen(!moreOpen)}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <span className="hidden sm:inline">Thêm</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border/60 bg-card shadow-lg py-1 z-50">
                    {secondary.map((l) => {
                      const Icon = l.icon;
                      const active = pathname === l.href;
                      return (
                        <Link key={l.href} href={l.href} onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                            active ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}>
                          <Icon className="h-4 w-4" />
                          {l.label}
                        </Link>
                      );
                    })}
                    <div className="border-t border-border/60 mt-1 pt-1">
                      <span className="block px-3 py-1 text-xs text-muted-foreground truncate">{user.name || user.email}</span>
                      <button onClick={logout} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <LogOut className="h-4 w-4" /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Đăng nhập</span>
              </Link>
              <Link href="/register" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]">
                <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">Đăng ký</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
