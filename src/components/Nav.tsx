"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Salad, LogOut, LayoutDashboard, Utensils, ChevronDown, User, Settings, LogIn, UserPlus, History, Dumbbell, Wallet, Users, ChefHat, BarChart3 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useTheme, SunIcon, MoonIcon } from "@/components/ThemeProvider";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const t = useT();
  const { dark, toggle } = useTheme();
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

  // Two primary destinations; related pages live in the grouped overflow menu.
  const primary = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/what-to-eat", label: "Ăn uống", icon: ChefHat },
  ];
  const moreGroups = [
    {
      label: "Ăn uống",
      items: [
        { href: "/foods", label: "Thư viện món ăn", icon: Utensils },
      ],
    },
    {
      label: "Theo dõi",
      items: [
        { href: "/insights", label: "Tiến độ & Nhật ký", icon: BarChart3 },
        { href: "/history", label: t("history"), icon: History },
        { href: "/profile", label: t("profile"), icon: User },
      ],
    },
    {
      label: "Kế hoạch",
      items: [
        { href: "/exercise", label: t("exercise"), icon: Dumbbell },
        { href: "/finance", label: t("finance"), icon: Wallet },
      ],
    },
    {
      label: "Khác",
      items: [
        { href: "/family", label: t("family"), icon: Users },
        { href: "/settings", label: t("settings"), icon: Settings },
      ],
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground tracking-tight shrink-0">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-[#faf3e8]">
            <img src="/logo-mark.png" alt="thuypn by kimnh" className="h-full w-full object-contain" />
          </span>
          <span className="hidden sm:inline">thuypn by kimnh</span>
        </Link>
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              {primary.map((l) => {
                const Icon = l.icon;
                const active = pathname === l.href || (l.href === "/what-to-eat" && pathname === "/foods");
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
              <button onClick={toggle} aria-label={dark ? "Chế độ sáng" : "Chế độ tối"} title={dark ? "Chế độ sáng" : "Chế độ tối"}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>
              <div className="relative" ref={moreRef}>
                <button onClick={() => setMoreOpen(!moreOpen)}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <span className="hidden sm:inline">{t("more")}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border/60 bg-card shadow-lg py-1 z-50">
                    {moreGroups.map((group, gi) => (
                      <div key={group.label}>
                        {gi > 0 && <div className="border-t border-border/60 my-1" />}
                        <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                          {group.label}
                        </div>
                        {group.items.map((l) => {
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
                      </div>
                    ))}
                    <div className="border-t border-border/60 mt-1 pt-1">
                      <span className="block px-3 py-1 text-xs text-muted-foreground truncate">{user.name || user.email}</span>
                      <button onClick={logout} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <LogOut className="h-4 w-4" /> {t("logout")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">{t("login")}</span>
              </Link>
              <Link href="/register" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]">
                <UserPlus className="h-4 w-4" /> <span className="hidden sm:inline">{t("register")}</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
