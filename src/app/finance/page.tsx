"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Plus, Users, AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/ToastProvider";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";
const CATS = ["Ăn uống", "Tập gym", "Mua sắm", "Di lại", "Hóa đơn", "Giải trí", "Khác"];

interface Summary {
  month: string;
  personal: { budget: number; spent: number };
  household: { budget: number; spent: number; isOwner: boolean; hasFamily: boolean };
  categories: { name: string; amount: number }[];
  history: { date: string; amount: number }[];
}

export default function FinancePage() {
  const t = useT();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const [data, setData] = useState<Summary | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: "Ăn uống", amount: "", date: new Date().toISOString().slice(0, 10), note: "", fundSource: "personal" });
  const [budgets, setBudgets] = useState({ personal: "", household: "" });
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/finance/summary?month=${month}`);
    if (res.status === 401) { router.push("/login"); return; }
    const d = await res.json();
    setData(d);
    setBudgets({ personal: String(d.personal.budget), household: String(d.household.budget) });
    setLoading(false);
  }, [month, router]);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/expense", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    if (res.ok) { const text = d.alert ? `Đã lưu. ${d.alert.threshold === 100 ? "🚨 Vượt" : "⚠️ Gần"} ngân sách!` : "Đã lưu chi tiêu"; setMsg(text); success(text); }
    else { setMsg(d.error || "Lỗi"); showError(d.error || "Không thể lưu chi tiêu"); }
    setForm({ ...form, amount: "", note: "" });
    load();
  }
  async function saveBudget(type: "personal" | "household") {
    const res = await fetch(`/api/budget/${type}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(budgets[type]) }) });
    if (res.ok) { setMsg("Đã cập nhật ngân sách"); success("Đã cập nhật ngân sách"); } else showError("Không thể cập nhật ngân sách");
    load();
  }

  if (loading || !data) return <div className="max-w-4xl mx-auto px-4 py-6"><div className="h-96 skeleton rounded-2xl" /></div>;

  const pPct = Math.min(100, (data.personal.spent / (data.personal.budget || 1)) * 100);
  const hPct = Math.min(100, (data.household.spent / (data.household.budget || 1)) * 100);
  const catTotal = data.categories.reduce((s, c) => s + c.amount, 0) || 1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("manage")}</p><h1 className="text-2xl font-semibold tracking-tight">{t("finance")}</h1></div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      </div>

      {msg && <div className="rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary">{msg}</div>}

      {/* Two budgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated space-y-3">
          <div className="flex items-center justify-between"><span className="text-sm font-semibold flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> Cá nhân</span>{pPct >= 80 && <AlertTriangle className="h-4 w-4 text-amber-500" />}</div>
          <div className="text-2xl font-bold">{fmt(data.personal.spent)}</div>
          <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${pPct >= 100 ? "bg-destructive" : pPct >= 80 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pPct}%` }} /></div>
          <div className="flex justify-between text-xs text-muted-foreground"><span>Ngân sách {fmt(data.personal.budget)}</span><span>{Math.round(pPct)}%</span></div>
          <div className="flex gap-2 pt-1"><input type="number" value={budgets.personal} onChange={e => setBudgets({ ...budgets, personal: e.target.value })} className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" /><button onClick={() => saveBudget("personal")} className="text-xs font-medium text-primary hover:underline">Lưu</button></div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated space-y-3">
          <div className="flex items-center justify-between"><span className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-sky-500" /> Gia đình</span>{hPct >= 80 && <AlertTriangle className="h-4 w-4 text-amber-500" />}</div>
          {data.household.hasFamily ? (
            <>
              <div className="text-2xl font-bold">{fmt(data.household.spent)}</div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${hPct >= 100 ? "bg-destructive" : hPct >= 80 ? "bg-amber-500" : "bg-sky-500"}`} style={{ width: `${hPct}%` }} /></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>Quỹ chung {fmt(data.household.budget)}</span><span>{Math.round(hPct)}%</span></div>
              {data.household.isOwner ? (
                <div className="flex gap-2 pt-1"><input type="number" value={budgets.household} onChange={e => setBudgets({ ...budgets, household: e.target.value })} className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" /><button onClick={() => saveBudget("household")} className="text-xs font-medium text-primary hover:underline">Lưu</button></div>
              ) : <div className="text-xs text-muted-foreground">Chỉ chủ gia đình được đổi quỹ chung</div>}
            </>
          ) : <div className="text-sm text-muted-foreground py-4">Bạn chưa có gia đình. Tạo ở trang Gia đình để dùng quỹ chung.</div>}
        </div>
      </div>

      {/* Category breakdown */}
      {data.categories.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-3">
          <h2 className="text-sm font-semibold">Theo danh mục</h2>
          {data.categories.map(c => (
            <div key={c.name} className="space-y-1">
              <div className="flex justify-between text-xs"><span className="text-foreground">{c.name}</span><span className="text-muted-foreground">{fmt(c.amount)}</span></div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary/70" style={{ width: `${(c.amount / catTotal) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <h2 className="text-sm font-semibold">Ghi nhận chi tiêu</h2>
        <form onSubmit={add} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">{CATS.map(c => <option key={c}>{c}</option>)}</select>
          <input type="number" placeholder="Số tiền (₫)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required min="1" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]"><Plus className="h-4 w-4" /> Thêm</button>
          <select value={form.fundSource} onChange={e => setForm({ ...form, fundSource: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:col-span-2"><option value="personal">Quỹ cá nhân</option><option value="household" disabled={!data.household.hasFamily}>Quỹ gia đình</option></select>
          <input placeholder="Ghi chú (tuỳ chọn)" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:col-span-2" />
        </form>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60"><h2 className="text-sm font-semibold">Lịch sử ({data.history.length} ngày)</h2></div>
        {data.history.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center"><Wallet className="h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Chưa có chi tiêu tháng này</p></div>
        ) : (
          <ul className="divide-y divide-border/60">
            {[...data.history].reverse().map(h => (<li key={h.date} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm">{h.date}</span><span className="text-sm font-semibold text-destructive">-{fmt(h.amount)}</span>
            </li>))}
          </ul>
        )}
      </div>
    </div>
  );
}
