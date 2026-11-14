"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Đăng nhập thất bại"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><LogIn className="h-6 w-6" /></span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Chào mừng trở lại</h1>
          <p className="mt-1 text-sm text-muted-foreground">Đăng nhập để tiếp tục theo dõi calo.</p>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
          {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <div className="mt-1 relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Mật khẩu</label>
            <div className="mt-1 relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản? <a href="/register" className="font-medium text-primary hover:underline">Đăng ký</a>
          </p>
        </form>
      </div>
    </div>
  );
}
