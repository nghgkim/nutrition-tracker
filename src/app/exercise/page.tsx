"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Plus, Trash2, Flame, Clock } from "lucide-react";

interface ExerciseLog { id: string; type: string; duration: number; calories: number; date: string; }
const TYPES = ["Chạy bộ", "Đi bộ", "Tập gym", "Bơi", "Đạp xe", "Yoga", "Cầu lông", "Khác"];

export default function ExercisePage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "Chạy bộ", duration: "", calories: "", date: new Date().toISOString().slice(0, 10) });

  async function load() {
    const res = await fetch("/api/exercise");
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setLogs(data.logs || []);
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/exercise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ ...form, duration: "", calories: "" });
    load();
  }
  async function del(id: string) { await fetch(`/api/exercise/${id}`, { method: "DELETE" }); load(); }

  const totalBurn = logs.reduce((s, l) => s + l.calories, 0);
  const totalMin = logs.reduce((s, l) => s + l.duration, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hoạt động</p><h1 className="text-2xl font-semibold tracking-tight">Tập luyện</h1></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/60 bg-card p-4 elevated"><div className="flex items-center gap-2 text-muted-foreground text-xs"><Flame className="h-4 w-4 text-rose-500" /> Calo đã đốt</div><div className="text-2xl font-bold">{totalBurn} <span className="text-sm font-normal text-muted-foreground">kcal</span></div></div>
        <div className="rounded-xl border border-border/60 bg-card p-4 elevated"><div className="flex items-center gap-2 text-muted-foreground text-xs"><Clock className="h-4 w-4 text-sky-500" /> Tổng thời gian</div><div className="text-2xl font-bold">{totalMin} <span className="text-sm font-normal text-muted-foreground">phút</span></div></div>
        <div className="rounded-xl border border-border/60 bg-card p-4 elevated"><div className="text-muted-foreground text-xs">Số buổi</div><div className="text-2xl font-bold">{logs.length}</div></div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <h2 className="text-sm font-semibold">Ghi nhận buổi tập</h2>
        <form onSubmit={add} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">{TYPES.map(t => <option key={t}>{t}</option>)}</select>
          <input type="number" placeholder="Phút" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} required className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="number" placeholder="Calo đốt" value={form.calories} onChange={e => setForm({...form, calories: e.target.value})} required className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" className="sm:col-span-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]"><Plus className="h-4 w-4" /> Thêm</button>
        </form>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60"><h2 className="text-sm font-semibold">Lịch sử</h2></div>
        {loading ? <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}</div> : logs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center"><Dumbbell className="h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Chưa có buổi tập nào</p></div>
        ) : (
          <ul className="divide-y divide-border/60">
            {[...logs].reverse().map(l => (<li key={l.id} className="flex items-center justify-between px-5 py-3">
              <div><div className="text-sm font-medium">{l.type}</div><div className="text-xs text-muted-foreground">{l.date.slice(0,10)} · {l.duration} phút</div></div>
              <div className="flex items-center gap-3"><span className="text-sm font-semibold text-rose-500">-{l.calories} kcal</span><button onClick={() => del(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
            </li>))}
          </ul>
        )}
      </div>
    </div>
  );
}
