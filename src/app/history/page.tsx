"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  if (loading) return <p className="text-center py-10">Đang tải...</p>;

  const byDate: Record<string, FoodLog[]> = {};
  for (const l of logs) { const key = l.date.slice(0, 10); (byDate[key] ||= []).push(l); }
  const dates = Object.keys(byDate).sort().reverse();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lịch sử</h1>
      {dates.length === 0 && <p className="text-gray-500 text-center py-10">Chưa có dữ liệu.</p>}
      {dates.map((d) => {
        const dayLogs = byDate[d];
        const total = dayLogs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
        return (
          <div key={d} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between mb-2">
              <h3 className="font-semibold">{d}</h3>
              <span className="text-green-600 font-medium">{Math.round(total)} kcal</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              {dayLogs.map((l) => (<li key={l.id}>{l.food.name} × {l.quantity} — {Math.round(l.food.calories * l.quantity)} kcal</li>))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
