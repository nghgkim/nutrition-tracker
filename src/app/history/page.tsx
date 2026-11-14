"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History as HistoryIcon, Flame } from "lucide-react";

interface FoodLog { id: string; quantity: number; date: string; food: { name: string; calories: number }; }

export default function HistoryPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/logs")
      .then((r) => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then((d) => { if (d) setLogs(d.logs || []); setLoading(false); });
  }, [router]);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 skeleton" />)}</div>;

  const byDate: Record<string, FoodLog[]> = {};
  for (const l of logs) { const key = l.date.slice(0, 10); (byDate[key] ||= []).push(l); }
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nhật ký</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lịch sử</h1>
      </div>
      {dates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><HistoryIcon className="h-6 w-6" /></span>
          <h3 className="mt-4 text-sm font-semibold text-foreground">Chưa có dữ liệu</h3>
          <p className="mt-1 text-xs text-muted-foreground">Bắt đầu ghi nhận món ăn ở Dashboard để xem lịch sử.</p>
          <a href="/dashboard" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]">Đi đến Dashboard</a>
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map((d) => {
            const dayLogs = byDate[d];
            const total = dayLogs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
            return (
              <div key={d} className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <HistoryIcon className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">{d}</h3>
                    <span className="text-xs text-muted-foreground">· {dayLogs.length} món</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    <Flame className="h-3.5 w-3.5" /> {Math.round(total)} kcal
                  </span>
                </div>
                <ul className="divide-y divide-border/60">
                  {dayLogs.map((l) => (
                    <li key={l.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <span className="text-foreground">{l.food.name} <span className="text-muted-foreground">× {l.quantity}</span></span>
                      <span className="text-muted-foreground">{Math.round(l.food.calories * l.quantity)} kcal</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
