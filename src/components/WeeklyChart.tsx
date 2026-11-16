"use client";
import { useEffect, useState } from "react";

interface FoodLog { quantity: number; date: string; food: { calories: number }; }

export default function WeeklyChart() {
  const [data, setData] = useState<{ date: string; label: string; calories: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(2000);

  useEffect(() => {
    Promise.all([
      fetch("/api/logs").then(r => r.json()),
      fetch("/api/goal").then(r => r.json()),
    ]).then(([logsData, goalData]) => {
      const logs: FoodLog[] = logsData.logs || [];
      const g = goalData.goal?.dailyCalories ?? 2000;
      setGoal(g);
      // build last 7 days
      const days: { date: string; label: string; calories: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" });
        const cal = logs
          .filter(l => l.date.slice(0, 10) === key)
          .reduce((s, l) => s + l.food.calories * l.quantity, 0);
        days.push({ date: key, label, calories: Math.round(cal) });
      }
      setData(days);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="h-48 skeleton rounded-2xl" />;

  const max = Math.max(goal, ...data.map(d => d.calories), 1);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Xu hướng</p>
          <h2 className="text-sm font-semibold text-foreground">Calo 7 ngày gần nhất</h2>
        </div>
        <span className="text-xs text-muted-foreground">Mục tiêu: {goal} kcal</span>
      </div>
      <div className="flex items-end justify-between gap-2 h-40">
        {data.map((d) => {
          const pct = (d.calories / max) * 100;
          const over = d.calories > goal;
          const isToday = d.date === new Date().toISOString().slice(0, 10);
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">{d.calories > 0 ? d.calories : ""}</span>
              <div className="w-full flex items-end justify-center" style={{ height: "100%" }}>
                <div
                  className={`w-full max-w-[28px] rounded-t-md transition-all duration-500 ${over ? "bg-destructive" : isToday ? "bg-primary" : "bg-primary/40"}`}
                  style={{ height: `${Math.max(2, pct)}%` }}
                  title={`${d.date}: ${d.calories} kcal`}
                />
              </div>
              <span className={`text-[10px] ${isToday ? "font-semibold text-primary" : "text-muted-foreground"}`}>{d.label}</span>
            </div>
          );
        })}
      </div>
      {/* goal line */}
      <div className="relative mt-2">
        <div className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/30" style={{ bottom: `${(goal / max) * 100}%` }} />
      </div>
    </div>
  );
}
