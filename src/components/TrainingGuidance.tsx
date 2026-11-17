"use client";
import { useEffect, useState } from "react";
import { Dumbbell, Check, CalendarDays, Utensils, Lightbulb } from "lucide-react";

interface Exercise { name: string; sets: string; reps: string; note: string; source: string; }
interface Meal { meal: string; ratio: number; icon: string; calories: number; }
const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export default function TrainingGuidance() {
  const [goal, setGoal] = useState("giảm cân");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [week, setWeek] = useState<{ day: number; done: boolean }[]>(DAYS.map((_, i) => ({ day: i, done: false })));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [target, setTarget] = useState(2000);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/training/suggestions?goal=${encodeURIComponent(goal)}`).then(r => r.json()),
      fetch("/api/training-plan").then(r => r.json()),
      fetch("/api/meal-plan").then(r => r.json()),
    ]).then(([ex, plan, mp]) => {
      setExercises(ex.exercises || []);
      if (plan.week) setWeek(plan.week);
      setMeals(mp.meals || []); setTarget(mp.target || 2000);
      setLoading(false);
    });
  }, [goal]);

  async function toggleDay(i: number) {
    const next = week.map((d, idx) => idx === i ? { ...d, done: !d.done } : d);
    setWeek(next);
    await fetch("/api/training-plan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week: next }) });
  }

  if (loading) return <div className="h-64 skeleton rounded-2xl" />;
  const doneCount = week.filter(d => d.done).length;

  return (
    <div className="space-y-4">
      {/* Suggestions */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Gợi ý bài tập theo mục tiêu</h2>
          <div className="flex gap-2">
            {["giảm cân", "tăng cơ", "duy trì"].map(g => (
              <button key={g} onClick={() => setGoal(g)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${goal === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>{g}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {exercises.map((e) => (
            <div key={e.name} className="rounded-xl border border-border/60 p-4 space-y-1.5">
              <div className="text-sm font-medium text-foreground">{e.name}</div>
              <div className="text-xs text-muted-foreground">{e.sets} · {e.reps}</div>
              <div className="text-xs text-muted-foreground">{e.note}</div>
              <div className="text-[10px] text-primary/70">Nguồn: {e.source}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly schedule */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-sky-500" /> Lịch tập tuần</h2>
          <span className="text-xs text-muted-foreground">{doneCount}/7 ngày hoàn thành</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(doneCount / 7) * 100}%` }} /></div>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((d, i) => (
            <button key={d} onClick={() => toggleDay(i)} className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all ${week[i]?.done ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
              <span className="text-xs font-medium text-muted-foreground">{d}</span>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${week[i]?.done ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {week[i]?.done ? <Check className="h-4 w-4" /> : <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Meal plan */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Utensils className="h-4 w-4 text-emerald-500" /> Chế độ ăn gợi ý theo mục tiêu {target.toLocaleString()} kcal</h2>
        <div className="space-y-2">
          {meals.map(m => (
            <div key={m.meal} className="space-y-1">
              <div className="flex justify-between text-xs"><span className="text-foreground">{m.icon} {m.meal}</span><span className="text-muted-foreground">{m.calories} kcal · {Math.round(m.ratio * 100)}%</span></div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${m.ratio * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Phân bổ bữa ăn theo khuyến nghị của Viện Dinh dưỡng (Bộ Y tế VN): sáng 25-30%, trưa 30-40%, tối 25-30%, xế 5-10%.</p>
      </div>
    </div>
  );
}
