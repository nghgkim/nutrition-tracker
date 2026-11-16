"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, Plus, Trash2, TrendingDown } from "lucide-react";

interface Expense { id: string; category: string; amount: number; date: string; note: string | null; }
const CATS = ["Ăn uống", "Tập gym", "Mua sắm", "Di lại", "Khác"];
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n) + " ₫";

export default function FinancePage() {
  const router = useRouter();
  const [data, setData] = useState<{ logs: Expense[]; total: number; budget: number }>({ logs: [], total: 0, budget: 2000000 });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ category: "Ăn uống", amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
  const [budgetInput, setBudgetInput] = useState("");

  async function load() {
    const res = await fetch("/api/expense");
    if (res.status === 401) { router.push("/login"); return; }
    const d = await res.json();
    setData(d);
    setBudgetInput(String(d.budget));
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/expense", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ ...form, amount: "", note: "" });
    load();
  }
  async function del(id: string) { await fetch(`/api/expense/${id}`, { method: "DELETE" }); load(); }
  async function saveBudget() { await fetch("/api/budget", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(budgetInput) }) }); load(); }

  const pct = Math.min(100, (data.total / data.budget) * 100);
  const over = data.total > data.budget;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quản lý</p><h1 className="text-2xl font-semibold tracking-tight">Tài chính</h1></div>
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
        <div className="flex justify-between items-baseline"><span className="text-sm text-muted-foreground">Chi tiêu tháng này</span><span className={`text-3xl font-bold ${over ? "text-destructive" : "text-foreground"}`}>{fmt(data.total)}</span></div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all ${over ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} /></div>
        <div className="flex justify-between text-xs text-muted-foreground"><span>Ngân sách: {fmt(data.budget)}</span><span>{Math.round(pct)}%</span></div>
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          <input type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm w-40 outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={saveBudget} className="text-sm font-medium text-primary hover:underline">Cập nhật ngân sách</button>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <h2 className="text-sm font-semibold">Ghi nhận chi tiêu</h2>
        <form onSubmit={add} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">{CATS.map(c => <option key={c}>{c}</option>)}</select>
          <input type="number" placeholder="Số tiền (₫)" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required min="1" className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]"><Plus className="h-4 w-4" /> Thêm</button>
          <input placeholder="Ghi chú (tuỳ chọn)" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="sm:col-span-4 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </form>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60"><h2 className="text-sm font-semibold">Lịch sử</h2></div>
        {loading ? <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}</div> : data.logs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center"><Wallet className="h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Chưa có chi tiêu nào</p></div>
        ) : (
          <ul className="divide-y divide-border/60">
            {[...data.logs].reverse().map(l => (<li key={l.id} className="flex items-center justify-between px-5 py-3">
              <div><div className="text-sm font-medium">{l.category}</div><div className="text-xs text-muted-foreground">{l.date.slice(0,10)}{l.note ? ` · ${l.note}` : ""}</div></div>
              <div className="flex items-center gap-3"><span className="text-sm font-semibold text-destructive">-{fmt(l.amount)}</span><button onClick={() => del(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
            </li>))}
          </ul>
        )}
      </div>
    </div>
  );
}
