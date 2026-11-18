"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, CalendarDays, Flame, Dumbbell, Save, Smile } from "lucide-react";

interface DayPoint { date: string; intake: number; burned: number; }
interface Entry { id: string; date: string; note: string | null; mood: string | null; energy: number | null; }
const MOODS = ["😊 Tốt", "😐 Bình thường", "😴 Mệt", "💪 Năng lượng", "😟 Căng thẳng"];

export default function InsightsPage() {
  const router = useRouter();
  const [range, setRange] = useState<"week"|"month">("week");
  const [data, setData] = useState<{ days: DayPoint[]; hitRate: number; goal: number } | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState(new Date().toISOString().slice(0,10));
  const [form, setForm] = useState({ note: "", mood: "", energy: "" });
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const [ins, jr] = await Promise.all([fetch(`/api/insights?range=${range}`), fetch("/api/journal")]);
    if (ins.status === 401) { router.push("/login"); return; }
    setData(await ins.json());
    setEntries((await jr.json()).entries || []);
  }, [range, router]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const e = entries.find(x => x.date.slice(0,10) === selected);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ note: e?.note || "", mood: e?.mood || "", energy: e?.energy ? String(e.energy) : "" });
  }, [selected, entries]);

  async function save() {
    await fetch(`/api/journal?date=${selected}`, { method: "PUT", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ ...form, energy: form.energy ? Number(form.energy) : null }) });
    setSaved(true); setTimeout(()=>setSaved(false), 2000); load();
  }

  if (!data) return <div className="max-w-5xl mx-auto px-4 py-6"><div className="h-96 skeleton rounded-2xl" /></div>;
  const maxVal = Math.max(...data.days.map(d=>Math.max(d.intake,d.burned)), 1);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Thống kê</p><h1 className="text-2xl font-semibold tracking-tight">Tiến độ & Nhật ký</h1></div>
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

      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-sky-500"/> Nhật ký cảm xúc</h2>
        <input type="date" value={selected} onChange={e=>setSelected(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"/>
        <div className="flex flex-wrap gap-2">{MOODS.map(m=><button key={m} onClick={()=>setForm({...form,mood:m})} className={`rounded-lg border px-3 py-1.5 text-xs ${form.mood===m?"border-primary bg-primary/10":"border-border"}`}>{m}</button>)}</div>
        <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Hôm nay bạn ăn gì, cảm thấy thế nào..." rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"/>
        <input type="number" placeholder="Mức năng lượng (1-10)" value={form.energy} onChange={e=>setForm({...form,energy:e.target.value})} className="w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"/>
        <div className="flex items-center gap-3"><button onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"><Save className="h-4 w-4"/> Lưu nhật ký</button>{saved&&<span className="text-sm text-primary">Đã lưu ✓</span>}</div>
        <div className="border-t border-border/60 pt-3 space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground">Các ghi chú gần đây ({entries.length})</h3>
          {entries.slice(-5).reverse().map(e=><div key={e.id} className="flex gap-3 text-sm"><span className="text-muted-foreground shrink-0">{e.date.slice(5,10)}</span><span>{e.mood} {e.note && `· ${e.note.slice(0,60)}`}</span></div>)}
          {entries.length===0&&<p className="text-xs text-muted-foreground">Chưa có ghi chú nào.</p>}
        </div>
      </div>
    </div>
  );
}
