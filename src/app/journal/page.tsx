"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Save, X, Tags } from "lucide-react";
import { monthRange, journalStats, type JournalEntry } from "@/lib/journal";
import { useToast } from "@/components/ToastProvider";

const MOODS = ["😊 Tốt", "😐 Bình thường", "😴 Mệt", "💪 Năng lượng", "😟 Căng thẳng", "🤩 Hào hứng", "🥱 Chán", "😠 Bực", "🥰 Yêu đời", "🤔 Suy tư"];
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function JournalPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(todayStr());
  const [form, setForm] = useState({ note: "", mood: "", energy: "", tags: [] as string[] });
  const [tagInput, setTagInput] = useState("");

  const { from, to } = monthRange(year, month);
  const load = useCallback(async () => {
    const res = await fetch(`/api/journal?from=${from}&to=${to}`);
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setEntries(data.entries || []);
    setLoading(false);
  }, [from, to, router]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const e = entries.find(x => x.date === selected);
    setForm({ note: e?.note || "", mood: e?.mood || "", energy: e?.energy ? String(e.energy) : "", tags: e?.tags || [] });
  }, [selected, entries]);

  async function save() {
    const res = await fetch(`/api/journal?date=${selected}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, energy: form.energy ? Number(form.energy) : null, tags: form.tags }),
    });
    if (res.ok) { success("Đã lưu nhật ký"); load(); }
    else showError("Không thể lưu nhật ký");
  }

  function addTag() {
    const tag = tagInput.trim().slice(0, 20);
    if (!tag) return;
    setForm(f => ({ ...f, tags: [...new Set([...f.tags, tag])].slice(0, 5) }));
    setTagInput("");
  }

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear()); setMonth(d.getUTCMonth() + 1);
  }

  const byDate = new Map(entries.map(e => [e.date, e]));
  const firstDay = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const stats = journalStats(entries);

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-6"><div className="h-96 skeleton rounded-2xl" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Theo dõi</p>
        <h1 className="text-2xl font-semibold tracking-tight">Nhật ký cảm xúc</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ghi lại cảm xúc, năng lượng và ghi chú mỗi ngày.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-sky-500"/> {year} / {pad(month)}</h2>
            <div className="flex gap-1">
              <button onClick={() => shiftMonth(-1)} aria-label="Tháng trước" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => shiftMonth(1)} aria-label="Tháng sau" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
            {WEEKDAYS.map(d => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;
              const dateStr = `${year}-${pad(month)}-${pad(day)}`;
              const e = byDate.get(dateStr);
              return (
                <button key={dateStr} onClick={() => setSelected(dateStr)}
                  className={`min-h-11 rounded-lg border text-xs transition-colors ${selected === dateStr ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted"}`}>
                  <div>{day}</div>
                  <div className="text-sm leading-none">{e?.mood?.slice(0, 2) || ""}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 elevated space-y-3">
          <h2 className="text-sm font-semibold">{selected}</h2>
          <div className="flex flex-wrap gap-2">
            {MOODS.map(m => <button key={m} onClick={() => setForm(f => ({ ...f, mood: m }))}
              className={`min-h-11 rounded-lg border px-2 text-xs ${form.mood === m ? "border-primary bg-primary/10" : "border-border"}`}>{m}</button>)}
          </div>
          <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="Hôm nay bạn cảm thấy thế nào?" rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="number" min={1} max={10} placeholder="Năng lượng (1-10)" value={form.energy}
            onChange={e => setForm(f => ({ ...f, energy: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><Tags className="h-3.5 w-3.5" /> Tags ({form.tags.length}/5)</div>
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map(t => <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">{t}
                <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))} aria-label={`Xóa tag ${t}`}><X className="h-3 w-3" /></button></span>)}
            </div>
            {form.tags.length < 5 && <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Thêm tag" className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={addTag} className="min-h-11 rounded-lg border border-border px-3 text-sm">Thêm</button>
            </div>}
          </div>
          <button onClick={save} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"><Save className="h-4 w-4" /> Lưu nhật ký</button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5 elevated space-y-3">
        <h2 className="text-sm font-semibold">Thống kê tháng này</h2>
        {stats.total === 0 ? <p className="text-sm text-muted-foreground">Chưa có dữ liệu tháng này.</p> : (
          <div className="space-y-2">
            <p className="text-sm">{stats.total} ngày đã ghi · năng lượng trung bình <span className="font-semibold text-primary">{stats.avgEnergy}</span>/10</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byMood).map(([mood, count]) => <span key={mood} className="rounded-full bg-muted px-3 py-1 text-xs">{mood} · {count}</span>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
