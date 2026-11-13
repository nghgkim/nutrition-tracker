"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
    { href: "/dashboard", label: "Dashboard" },
    { href: "/foods", label: "Món ăn" },
    { href: "/history", label: "Lịch sử" },
  ];

  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-green-600 text-lg">🥗 Nutrition Tracker</Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {links.map((l) => (
                <Link key={l.href} href={l.href}
                  className={`text-sm ${pathname === l.href ? "text-green-600 font-semibold" : "text-gray-600 hover:text-green-600"}`}>
                  {l.label}
                </Link>
              ))}
              <span className="text-sm text-gray-500">{user.name || user.email}</span>
              <button onClick={logout} className="text-sm text-red-500 hover:text-red-700">Đăng xuất</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-green-600">Đăng nhập</Link>
              <Link href="/register" className="text-sm bg-green-600 text-white px-3 py-1 rounded">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
