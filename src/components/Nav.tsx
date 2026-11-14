"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Salad, LogOut, LayoutDashboard, Utensils, History, LogIn, UserPlus } from "lucide-react";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/foods", label: "Món ăn", icon: Utensils },
    { href: "/history", label: "Lịch sử", icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Salad className="h-4 w-4" />
          </span>
          <span>Nutrition Tracker</span>
        </Link>
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              {links.map((l) => {
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
              <span className="ml-2 hidden md:inline text-xs text-muted-foreground">{user.name || user.email}</span>
              <button onClick={logout}
                className="ml-1 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <LogIn className="h-4 w-4" /> Đăng nhập
              </Link>
              <Link href="/register" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]">
                <UserPlus className="h-4 w-4" /> Đăng ký
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
