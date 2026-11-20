"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Target, Flame, Scale, User, Save, Plus, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { classifyBMI } from "@/lib/bmi-asian";
import { useToast } from "@/components/ToastProvider";

const ACTIVITY_FACTORS: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
const ACTIVITY_LABELS: Record<string, string> = { sedentary: "Ít vận động", light: "Nhẹ (1-3 buổi/tuần)", moderate: "Trung bình (3-5 buổi/tuần)", active: "Nhiều (6-7 buổi/tuần)", very_active: "Rất nhiều" };

function calcBMR(w: number, h: number, a: number, g: string): number {
  if (g === "male") return 10 * w + 6.25 * h - 5 * a + 5;
  return 10 * w + 6.25 * h - 5 * a - 161;
}
function calcBMI(w: number, h: number): number { const hh = h / 100; return w / (hh * hh); }


interface WeightLog { id: string; weight: number; date: string; note: string | null; }

export default function ProfilePage() {
  const t = useT();
  const router = useRouter();
  const [profile, setProfile] = useState({ height: "", age: "", gender: "male", activity: "moderate", targetWeight: "" });
  const [currentWeight, setCurrentWeight] = useState("");
  const [goal, setGoal] = useState<"lose" | "maintain" | "gain">("maintain");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [waistInput, setWaistInput] = useState("");
  const [saved, setSaved] = useState(false);
  const { success, error: showError } = useToast();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [wForm, setWForm] = useState({ weight: "", date: new Date().toISOString().slice(0, 10), note: "" });
  const [wAdding, setWAdding] = useState(false);
  const [recommended, setRecommended] = useState<{ calories: number; source: string } | null>(null);

  useEffect(() => {
    Promise.all([fetch("/api/profile"), fetch("/api/weight")]).then(async ([pRes, wRes]) => {
      if (pRes.status === 401) { router.push("/login"); return; }
      const pData = await pRes.json();
      const wData = await wRes.json();
      const prof = pData.profile || {};
      setProfile({ height: prof.height ? String(prof.height) : "", age: prof.age ? String(prof.age) : "", gender: prof.gender || "male", activity: prof.activity || "moderate", targetWeight: prof.targetWeight ? String(prof.targetWeight) : "" });
      const logs = wData.logs || [];
      setWeightLogs(logs);
      if (logs.length > 0) setCurrentWeight(String(logs[logs.length - 1].weight));
      fetch("/api/nutrition/recommended").then(r => r.json()).then(setRecommended).catch(() => {});
      setLoading(false);
    });
  }, [router]);

  async function loadWeights() {
    const res = await fetch("/api/weight");
    const data = await res.json();
    setWeightLogs(data.logs || []);
    if (data.logs && data.logs.length > 0) setCurrentWeight(String(data.logs[data.logs.length - 1].weight));
  }

  const w = parseFloat(currentWeight); const h = parseFloat(profile.height); const a = parseInt(profile.age);
  const hasData = w > 0 && h > 0 && a > 0;
  const bmr = hasData ? calcBMR(w, h, a, profile.gender) : 0;
  const tdee = hasData ? bmr * (ACTIVITY_FACTORS[profile.activity] || 1.55) : 0;
  const bmi = hasData ? calcBMI(w, h) : 0;
  const bmiInfo = hasData ? classifyBMI(bmi, profile.gender as "male"|"female", waistInput ? Number(waistInput) : null) : null;
  let targetCalories = tdee;
  if (goal === "lose") targetCalories = tdee - 500;
  if (goal === "gain") targetCalories = tdee + 500;
  targetCalories = Math.max(1200, Math.round(targetCalories));
  const weeksToGoal = profile.targetWeight && w > 0 ? Math.abs(w - parseFloat(profile.targetWeight)) / 0.5 : null;
  const latest = weightLogs.length ? weightLogs[weightLogs.length - 1].weight : null;
  const first = weightLogs.length ? weightLogs[0].weight : null;
  const diff = latest !== null && first !== null ? latest - first : 0;

  async function saveProfile() {
    setSaving(true);
    await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ height: profile.height ? Number(profile.height) : null, age: profile.age ? Number(profile.age) : null, gender: profile.gender, activity: profile.activity, targetWeight: profile.targetWeight ? Number(profile.targetWeight) : null }) });
    await fetch("/api/goal", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dailyCalories: targetCalories }) });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); success("Đã lưu hồ sơ và mục tiêu");
  }
  async function addWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!wForm.weight) return;
    setWAdding(true);
    const res = await fetch("/api/weight", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weight: Number(wForm.weight), date: wForm.date, note: wForm.note || null }) });
    if (res.ok) success("Đã lưu cân nặng"); else showError("Không thể lưu cân nặng");
    setWForm({ weight: "", date: new Date().toISOString().slice(0, 10), note: "" });
    setWAdding(false);
    loadWeights();
  }
  async function deleteWeight(id: string) { const res = await fetch(`/api/weight/${id}`, { method: "DELETE" }); if (res.ok) { success("Đã xoá cân nặng"); loadWeights(); } else showError("Không thể xoá"); }

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8"><div className="h-64 skeleton rounded-2xl" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("profile")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cân nặng & Mục tiêu calo</h1>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Thông tin cá nhân</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="text-xs font-medium text-foreground">Cân nặng hiện tại (kg)</label><input type="number" step="0.1" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} placeholder="VD: 70" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
          <div><label className="text-xs font-medium text-foreground">Chiều cao (cm)</label><input type="number" value={profile.height} onChange={(e) => setProfile({ ...profile, height: e.target.value })} placeholder="VD: 170" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
          <div><label className="text-xs font-medium text-foreground">Tuổi</label><input type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} placeholder="VD: 25" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
          <div><label className="text-xs font-medium text-foreground">Giới tính</label><select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"><option value="male">Nam</option><option value="female">Nữ</option></select></div>
          <div><label className="text-xs font-medium text-foreground">Mức độ vận động</label><select value={profile.activity} onChange={(e) => setProfile({ ...profile, activity: e.target.value })} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">{Object.entries(ACTIVITY_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select></div>
          <div><label className="text-xs font-medium text-foreground">Cân nặng mong muốn (kg)</label><input type="number" step="0.1" value={profile.targetWeight} onChange={(e) => setProfile({ ...profile, targetWeight: e.target.value })} placeholder="VD: 65" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
          <div><label className="text-xs font-medium text-foreground">Vòng eo (cm - tùy chọn)</label><input type="number" step="0.5" value={waistInput} onChange={(e) => setWaistInput(e.target.value)} placeholder="VD: 75" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
        </div>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Mục tiêu</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[{ key: "lose" as const, label: "Giảm cân", desc: "Thâm hụt 500 kcal" }, { key: "maintain" as const, label: "Duy trì", desc: "Giữ nguyên" }, { key: "gain" as const, label: "Tăng cân", desc: "Thặng dư 500 kcal" }].map((g) => (
            <button key={g.key} onClick={() => setGoal(g.key)} className={`rounded-xl border p-4 text-left transition-all ${goal === g.key ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}>
              <div className="text-sm font-semibold text-foreground">{g.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
            </button>
          ))}
        </div>
      </div>
      {hasData && (
        <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Kết quả</h2>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div><div className="text-xs text-muted-foreground">BMI</div><div className={`text-2xl font-bold tracking-tight ${bmiInfo!.color}`}>{bmiInfo!.bmi}</div></div>
            <div className={`text-sm font-medium ${bmiInfo!.color}`}>{bmiInfo!.category}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/50"><div className="text-xs text-muted-foreground">BMR</div><div className="text-xl font-bold tracking-tight">{Math.round(bmr)} <span className="text-sm font-normal text-muted-foreground">kcal</span></div></div>
            <div className="p-4 rounded-xl bg-muted/50"><div className="text-xs text-muted-foreground">TDEE</div><div className="text-xl font-bold tracking-tight">{Math.round(tdee)} <span className="text-sm font-normal text-muted-foreground">kcal</span></div></div>
          </div>
          <div className="p-5 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div><div className="text-xs text-muted-foreground">Mục tiêu calo/ngày</div><div className="text-3xl font-bold tracking-tight text-primary">{targetCalories} <span className="text-sm font-normal text-muted-foreground">kcal</span></div></div>
              <Flame className="h-8 w-8 text-primary/40" />
            </div>
            {weeksToGoal !== null && weeksToGoal > 0 && <p className="mt-2 text-xs text-muted-foreground">Ước tính đạt {profile.targetWeight} kg sau ~{Math.round(weeksToGoal)} tuần.</p>}
          </div>
          <button onClick={saveProfile} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Đang lưu..." : "Lưu & cập nhật mục tiêu calo"} {saved && "✓"}
          </button>
        </div>
      )}
      {recommended && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 elevated space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">🎯 Nhu cầu calo khuyến nghị</div>
            <div className="text-2xl font-bold text-primary">{recommended.calories} <span className="text-sm font-normal text-muted-foreground">kcal/ngày</span></div>
          </div>
          <p className="text-[10px] text-primary/70">Nguồn: {recommended.source}</p>
          {targetCalories !== recommended.calories && (
            <button onClick={async () => { await fetch("/api/goal", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dailyCalories: recommended.calories }) }); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]">Áp dụng khuyến nghị</button>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Scale className="h-4 w-4 text-primary" /> Theo dõi cân nặng</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center"><div className="text-2xl font-bold tracking-tight">{latest !== null ? latest.toFixed(1) : "—"} <span className="text-sm font-normal text-muted-foreground">kg</span></div><div className="text-xs text-muted-foreground">Hiện tại</div></div>
          <div className="text-center"><div className={`text-2xl font-bold tracking-tight ${diff <= 0 ? "text-emerald-500" : "text-rose-500"}`}>{diff > 0 ? "+" : ""}{diff.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">kg</span></div><div className="text-xs text-muted-foreground">Thay đổi</div></div>
          <div className="text-center"><div className="text-2xl font-bold tracking-tight">{weightLogs.length}</div><div className="text-xs text-muted-foreground">Số lần ghi</div></div>
        </div>
        {weightLogs.length > 1 && (
          <div className="flex items-end gap-1 h-32 mt-4">
            {weightLogs.map((l) => {
              const mn = Math.min(...weightLogs.map(x => x.weight)); const mx = Math.max(...weightLogs.map(x => x.weight));
              const range = mx - mn || 1; const pct = ((l.weight - mn) / range) * 70 + 30;
              return (<div key={l.id} className="flex-1 flex flex-col items-center gap-1" title={`${l.date.slice(0,10)}: ${l.weight}kg`}>
                <div className="w-full max-w-[20px] rounded-t-md bg-primary transition-all" style={{ height: `${pct}%` }} />
                <span className="text-[9px] text-muted-foreground">{l.date.slice(5)}</span>
              </div>);
            })}
          </div>
        )}
        <form onSubmit={addWeight} className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="number" step="0.1" placeholder="Cân nặng (kg) *" value={wForm.weight} onChange={(e) => setWForm({ ...wForm, weight: e.target.value })} required className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="date" value={wForm.date} onChange={(e) => setWForm({ ...wForm, date: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input placeholder="Ghi chú" value={wForm.note} onChange={(e) => setWForm({ ...wForm, note: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={wAdding} className="sm:col-span-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
            <Plus className="h-4 w-4" /> {wAdding ? "Đang thêm..." : "Ghi nhận cân nặng"}
          </button>
        </form>
        {weightLogs.length > 0 && (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="border-b border-border/60 px-4 py-2 bg-muted/30"><h3 className="text-xs font-semibold text-foreground">Lịch sử</h3></div>
            <ul className="divide-y divide-border/60 max-h-48 overflow-y-auto">
              {[...weightLogs].reverse().map((l) => (
                <li key={l.id} className="flex items-center justify-between px-4 py-2">
                  <div className="text-sm">{l.weight.toFixed(1)} kg <span className="text-xs text-muted-foreground ml-2">{l.date.slice(0, 10)}{l.note ? ` · ${l.note}` : ""}</span></div>
                  <button onClick={() => deleteWeight(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
