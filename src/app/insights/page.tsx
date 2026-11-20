"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, CalendarDays, Flame, Save } from "lucide-react";

interface DayPoint { date: string; intake: number; burned: number; }
interface Entry { id: string; date: string; note: string | null; mood: string | null; energy: number | null; }

export default function InsightsPage() {
  const router = useRouter();
  const [range, setRange] = useState<"week"|"month">("week");
  const [data, setData] = useState<{ days: DayPoint[]; hitRate: number; goal: number } | null>(null);

  const load = useCallback(async () => {
    const ins = await fetch(`/api/insights?range=${range}`);
    if (ins.status === 401) { router.push("/login"); return; }
    setData(await ins.json());
  }, [range, router]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="max-w-5xl mx-auto px-4 py-6"><div className="h-96 skeleton rounded-2xl" /></div>;
  const maxVal = Math.max(...data.days.map(d=>Math.max(d.intake,d.burned)), 1);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Thống kê</p><h1 className="text-2xl font-semibold tracking-tight">Tiến độ</h1></div>
        <div className="flex gap-2">{(["week","month"] as const).map(r=><button key={r} onClick={()=>setRange(r)} className={`rounded-lg px-3 py-1.5 text-sm ${range===r?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>{r==="week"?"7 ngày":"30 ngày"}</button>)}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated"><div className="text-xs text-muted-foreground flex items-center gap-1"><Flame className="h-4 w-4 text-rose-500"/> Tỷ lệ ngày đạt</div><div className="text-2xl font-bold mt-1">{data.hitRate}%</div></div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated"><div className="text-xs text-muted-foreground">Mục tiêu</div><div className="text-2xl font-bold mt-1">{data.goal} kcal</div></div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated"><div className="text-xs text-muted-foreground">Số ngày có dữ liệu</div><div className="text-2xl font-bold mt-1">{data.days.filter(d=>d.intake>0).length}</div></div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary"/> Nạp vs Đốt</h2>
        {data.days.every(d=>d.intake===0&&d.burned===0) ? <p className="text-sm text-muted-foreground py-8 text-center">Chưa có dữ liệu trong khoảng này.</p> : (
          <div className="flex items-end gap-1 h-48">
            {data.days.map(d=>(
              <div key={d.date} className="flex-1 flex items-end justify-center gap-0.5" title={`${d.date}: nạp ${Math.round(d.intake)}, đốt ${d.burned}`}>
                <div className="w-1/3 rounded-t-sm bg-primary" style={{height:`${(d.intake/maxVal)*100}%`}}/>
                <div className="w-1/3 rounded-t-sm bg-rose-500" style={{height:`${(d.burned/maxVal)*100}%`}}/>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary"/>Nạp</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-rose-500"/>Đốt</span></div>
      </div>

    </div>
  );
}
