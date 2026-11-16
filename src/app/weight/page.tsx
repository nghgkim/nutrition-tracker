"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Scale, TrendingDown, TrendingUp } from "lucide-react";

interface WeightLog { id: string; weight: number; date: string; note: string | null; }

export default function WeightPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ weight: "", date: new Date().toISOString().slice(0, 10), note: "" });
  const [adding, setAdding] = useState(false);

  async function load() {
    const res = await fetch("/api/weight");
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addLog(e: React.FormEvent) {
    e.preventDefault();
    if (!form.weight) return;
    setAdding(true);
    await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: Number(form.weight), date: form.date, note: form.note || null }),
    });
    setForm({ weight: "", date: new Date().toISOString().slice(0, 10), note: "" });
    setAdding(false);
    load();
  }
  async function deleteLog(id: string) { await fetch(`/api/weight/${id}`, { method: "DELETE" }); load(); }

  const latest = logs.length ? logs[logs.length - 1].weight : null;
  const first = logs.length ? logs[0].weight : null;
  const diff = latest !== null && first !== null ? latest - first : 0;
  const maxW = logs.length ? Math.max(...logs.map(l => l.weight)) : 0;
  const minW = logs.length ? Math.min(...logs.map(l => l.weight)) : 0;
  const range = maxW - minW || 1;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Theo dõi</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cân nặng</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Scale className="h-5 w-5" /></span>
            <div>
              <div className="text-2xl font-bold tracking-tight">{latest !== null ? latest.toFixed(1) : "—"} <span className="text-sm font-normal text-muted-foreground">kg</span></div>
              <div className="text-xs text-muted-foreground">Cân nặng hiện tại</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${diff <= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
              {diff <= 0 ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
            </span>
            <div>
              <div className={`text-2xl font-bold tracking-tight ${diff <= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {diff > 0 ? "+" : ""}{diff.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">kg</span>
              </div>
              <div className="text-xs text-muted-foreground">Thay đổi từ đầu</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Scale className="h-5 w-5" /></span>
            <div>
              <div className="text-2xl font-bold tracking-tight">{logs.length}</div>
              <div className="text-xs text-muted-foreground">Số lần ghi nhận</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {logs.length > 1 && (
        <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
          <h2 className="text-sm font-semibold text-foreground mb-4">Biểu đồ cân nặng</h2>
          <div className="flex items-end gap-1 h-48">
            {logs.map((l) => {
              const pct = ((l.weight - minW) / range) * 80 + 20;
              return (
                <div key={l.id} className="flex-1 flex flex-col items-center gap-1" title={`${l.date.slice(0,10)}: ${l.weight}kg`}>
                  <span className="text-[10px] text-muted-foreground">{l.weight}</span>
                  <div className="w-full max-w-[24px] rounded-t-md bg-primary transition-all" style={{ height: `${pct}%` }} />
                  <span className="text-[9px] text-muted-foreground">{l.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <h2 className="text-sm font-semibold text-foreground">Ghi nhận cân nặng</h2>
        <form onSubmit={addLog} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="number" step="0.1" placeholder="Cân nặng (kg) *" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input placeholder="Ghi chú (tuỳ chọn)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={adding} className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
            <Plus className="h-4 w-4" /> {adding ? "Đang thêm..." : "Ghi nhận"}
          </button>
        </form>
      </div>

      {/* History */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}</div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Scale className="h-6 w-6" /></span>
          <h3 className="mt-4 text-sm font-semibold text-foreground">Chưa có dữ liệu cân nặng</h3>
          <p className="mt-1 text-xs text-muted-foreground">Ghi nhận cân nặng đầu tiên ở biểu mẫu phía trên.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
          <div className="border-b border-border/60 px-5 py-3"><h2 className="text-sm font-semibold text-foreground">Lịch sử cân nặng</h2></div>
          <ul className="divide-y divide-border/60">
            {[...logs].reverse().map((l) => (
              <li key={l.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-foreground">{l.weight.toFixed(1)} kg</div>
                  <div className="text-xs text-muted-foreground">{l.date.slice(0, 10)}{l.note ? ` · ${l.note}` : ""}</div>
                </div>
                <button onClick={() => deleteLog(l.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
