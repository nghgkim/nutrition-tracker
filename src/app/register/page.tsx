"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Lock, User, Sparkles, Check } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Đăng ký thất bại"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid lg:grid-cols-2">
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 p-12 text-white">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0, transparent 40%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><Sparkles className="h-5 w-5" /></span>
            <span className="text-lg font-semibold tracking-tight">Nutrition Tracker</span>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold tracking-tight leading-tight">Bắt đầu hành trình<br />khoẻ mạnh hôm nay.</h2>
          <p className="text-emerald-100/80 text-lg max-w-md">Tạo tài khoản miễn phí và theo dõi calo ngay lập tức.</p>
          <ul className="space-y-3 text-sm">
            {["Không cần thẻ tín dụng", "Dữ liệu cá nhân được bảo mật", "Mục tiêu calo tuỳ chỉnh", "Lịch sử không giới hạn"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20"><Check className="h-3 w-3" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-emerald-200/60">© 2026 Nutrition Tracker</div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-6 w-6" /></span>
            <h1 className="mt-3 text-xl font-semibold tracking-tight">Nutrition Tracker</h1>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tạo tài khoản</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Miễn phí, chỉ mất 30 giây.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {error && <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive border border-destructive/20">{error}</div>}
            <div>
              <label className="text-xs font-medium text-foreground">Tên (tuỳ chọn)</label>
              <div className="mt-1.5 relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input placeholder="Tên của bạn" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card pl-10 pr-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Email</label>
              <div className="mt-1.5 relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-lg border border-border bg-card pl-10 pr-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Mật khẩu (≥6 ký tự)</label>
              <div className="mt-1.5 relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full rounded-lg border border-border bg-card pl-10 pr-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 focus:ring-ring focus:border-transparent" />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> {loading ? "Đang đăng ký..." : "Đăng ký"}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              Đã có tài khoản? <a href="/login" className="font-medium text-primary hover:underline">Đăng nhập</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
