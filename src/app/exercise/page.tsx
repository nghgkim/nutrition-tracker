"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Plus, Trash2, Flame, Clock, Target, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import TrainingGuidance from "@/components/TrainingGuidance";

interface ExerciseLog { id: string; type: string; duration: number; calories: number; date: string; }
const TYPES = ["Chạy bộ", "Đi bộ", "Tập gym", "Bơi", "Đạp xe", "Yoga", "Cầu lông", "Khác"];

export default function ExercisePage() {
  const t = useT();
  const router = useRouter();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [goal, setGoal] = useState(300);
  const [goalInput, setGoalInput] = useState("300");
  const [streak, setStreak] = useState(0);
  const [trend, setTrend] = useState<{ date: string; calories: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "Chạy bộ", duration: "", calories: "", date: new Date().toISOString().slice(0, 10) });

  const load = useCallback(async () => {
    const [lRes, gRes, sRes] = await Promise.all([fetch("/api/exercise"), fetch("/api/exercise/goal"), fetch("/api/exercise/streak")]);
    if (lRes.status === 401) { router.push("/login"); return; }
    const l = await lRes.json(); const g = await gRes.json(); const s = await sRes.json();
    setLogs(l.logs || []); setGoal(g.calories); setGoalInput(String(g.calories));
    setStreak(s.streak); setTrend(s.trend || []); setLoading(false);
  }, [router]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/exercise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({ ...form, duration: "", calories: "" });
    load();
  }
  async function del(id: string) { await fetch(`/api/exercise/${id}`, { method: "DELETE" }); load(); }
  async function saveGoal() { await fetch("/api/exercise/goal", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calories: Number(goalInput) }) }); load(); }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-6"><div className="h-96 skeleton rounded-2xl" /></div>;

  const today = new Date().toISOString().slice(0, 10);
  const todayBurn = logs.filter(l => l.date.slice(0, 10) === today).reduce((s, l) => s + l.calories, 0);
  const pct = Math.min(100, (todayBurn / (goal || 1)) * 100);
  const totalBurn = logs.reduce((s, l) => s + l.calories, 0);
  const totalMin = logs.reduce((s, l) => s + l.duration, 0);
  const maxTrend = Math.max(...trend.map(t => t.calories), 1);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("activity")}</p><h1 className="text-2xl font-semibold tracking-tight">{t("exercise")}</h1></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Goal ring */}
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated flex flex-col items-center">
          <div className="relative w-32 h-32">
            <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
              <circle cx="64" cy="64" r="54" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
              <circle cx="64" cy="64" r="54" fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 54} strokeDashoffset={2 * Math.PI * 54 - (pct / 100) * 2 * Math.PI * 54} className={todayBurn >= goal ? "stroke-emerald-500" : "stroke-primary"} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{todayBurn}</span>
              <span className="text-[10px] text-muted-foreground">/ {goal} kcal</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3.5 w-3.5" /> Mục tiêu hôm nay</div>
          <div className="mt-2 flex gap-2"><input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)} className="w-20 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring" /><button onClick={saveGoal} className="text-xs font-medium text-primary hover:underline">Lưu</button></div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated space-y-3">
          <div><div className="flex items-center gap-2 text-muted-foreground text-xs"><Zap className="h-4 w-4 text-amber-500" /> Chuỗi tập luyện</div><div className="text-3xl font-bold mt-1">{streak} <span className="text-sm font-normal text-muted-foreground">ngày</span></div></div>
          <div><div className="flex items-center gap-2 text-muted-foreground text-xs"><Flame className="h-4 w-4 text-rose-500" /> Tổng calo đốt</div><div className="text-2xl font-bold mt-1">{totalBurn} <span className="text-sm font-normal text-muted-foreground">kcal</span></div></div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated space-y-3">
          <div><div className="flex items-center gap-2 text-muted-foreground text-xs"><Clock className="h-4 w-4 text-sky-500" /> Tổng thời gian</div><div className="text-2xl font-bold mt-1">{totalMin} <span className="text-sm font-normal text-muted-foreground">phút</span></div></div>
          <div><div className="text-muted-foreground text-xs">Số buổi</div><div className="text-2xl font-bold mt-1">{logs.length}</div></div>
        </div>
      </div>

      {/* 7-day trend */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <h2 className="text-sm font-semibold">Xu hướng 7 ngày</h2>
        <div className="flex items-end gap-2 h-32 mt-4">
          {trend.map(t => (
            <div key={t.date} className="flex-1 flex flex-col items-center gap-1" title={`${t.date}: ${t.calories} kcal`}>
              <span className="text-[10px] text-muted-foreground">{t.calories > 0 ? t.calories : ""}</span>
              <div className={`w-full max-w-[28px] rounded-t-md transition-all ${t.date === today ? "bg-primary" : "bg-primary/40"}`} style={{ height: `${Math.max(2, (t.calories / maxTrend) * 100)}%` }} />
              <span className="text-[9px] text-muted-foreground">{t.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <h2 className="text-sm font-semibold">Ghi nhận buổi tập</h2>
        <form onSubmit={add} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">{TYPES.map(t => <option key={t}>{t}</option>)}</select>
          <input type="number" placeholder="Phút" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} required className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="number" placeholder="Calo đốt" value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} required className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]"><Plus className="h-4 w-4" /> Thêm</button>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="sm:col-span-4 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        </form>
      </div>

      <TrainingGuidance />

      <div className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
        <div className="px-5 py-3 border-b border-border/60"><h2 className="text-sm font-semibold">Lịch sử</h2></div>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center"><Dumbbell className="h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Chưa có buổi tập nào</p></div>
        ) : (
          <ul className="divide-y divide-border/60">
            {[...logs].reverse().map(l => (<li key={l.id} className="flex items-center justify-between px-5 py-3">
              <div><div className="text-sm font-medium">{l.type}</div><div className="text-xs text-muted-foreground">{l.date.slice(0, 10)} · {l.duration} phút</div></div>
              <div className="flex items-center gap-3"><span className="text-sm font-semibold text-rose-500">-{l.calories} kcal</span><button onClick={() => del(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>
            </li>))}
          </ul>
        )}
      </div>
    </div>
  );
}
