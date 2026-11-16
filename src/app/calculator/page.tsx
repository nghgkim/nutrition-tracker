"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Target, Flame, Scale, Activity, User, Save } from "lucide-react";

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Ít vận động (văn phòng)",
  light: "Nhẹ (1-3 buổi/tuần)",
  moderate: "Trung bình (3-5 buổi/tuần)",
  active: "Nhiều (6-7 buổi/tuần)",
  very_active: "Rất nhiều (vận động viên)",
};

function calcBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender === "male") return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function calcBMI(weight: number, height: number): number {
  const h = height / 100;
  return weight / (h * h);
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Thiếu cân", color: "text-blue-500" };
  if (bmi < 25) return { label: "Bình thường", color: "text-emerald-500" };
  if (bmi < 30) return { label: "Thừa cân", color: "text-amber-500" };
  return { label: "Béo phì", color: "text-rose-500" };
}

export default function CalculatorPage() {
  const router = useRouter();
  const [profile, setProfile] = useState({ height: "", age: "", gender: "male", activity: "moderate", targetWeight: "" });
  const [currentWeight, setCurrentWeight] = useState("");
  const [goal, setGoal] = useState<"lose" | "maintain" | "gain">("maintain");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([fetch("/api/profile"), fetch("/api/weight")]).then(async ([pRes, wRes]) => {
      if (pRes.status === 401) { router.push("/login"); return; }
      const pData = await pRes.json();
      const wData = await wRes.json();
      const prof = pData.profile || {};
      setProfile({
        height: prof.height ? String(prof.height) : "",
        age: prof.age ? String(prof.age) : "",
        gender: prof.gender || "male",
        activity: prof.activity || "moderate",
        targetWeight: prof.targetWeight ? String(prof.targetWeight) : "",
      });
      if (wData.logs && wData.logs.length > 0) {
        setCurrentWeight(String(wData.logs[wData.logs.length - 1].weight));
      }
      setLoading(false);
    });
  }, []);

  const w = parseFloat(currentWeight);
  const h = parseFloat(profile.height);
  const a = parseInt(profile.age);
  const hasData = w > 0 && h > 0 && a > 0;

  const bmr = hasData ? calcBMR(w, h, a, profile.gender) : 0;
  const tdee = hasData ? bmr * (ACTIVITY_FACTORS[profile.activity] || 1.55) : 0;
  const bmi = hasData ? calcBMI(w, h) : 0;
  const bmiInfo = hasData ? bmiCategory(bmi) : null;

  let targetCalories = tdee;
  if (goal === "lose") targetCalories = tdee - 500;
  if (goal === "gain") targetCalories = tdee + 500;
  targetCalories = Math.max(1200, Math.round(targetCalories));

  // Weight loss estimate: 0.5kg/week = ~500 kcal/day deficit
  const weeksToGoal = profile.targetWeight && w > 0
    ? Math.abs(w - parseFloat(profile.targetWeight)) / 0.5
    : null;

  async function saveProfile() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        height: profile.height ? Number(profile.height) : null,
        age: profile.age ? Number(profile.age) : null,
        gender: profile.gender,
        activity: profile.activity,
        targetWeight: profile.targetWeight ? Number(profile.targetWeight) : null,
      }),
    });
    // Also update daily goal
    await fetch("/api/goal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyCalories: targetCalories }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8"><div className="h-64 skeleton rounded-2xl" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Công cụ</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tính toán calo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tính BMR, TDEE và mục tiêu calo dựa trên cân nặng và mục tiêu của bạn.</p>
      </div>

      {/* Input form */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Thông tin cá nhân</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-foreground">Cân nặng hiện tại (kg)</label>
            <input type="number" step="0.1" value={currentWeight} onChange={(e) => setCurrentWeight(e.target.value)} placeholder="VD: 70"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <p className="mt-1 text-[10px] text-muted-foreground">Lấy từ cân nặng mới nhất. Cập nhật ở trang Cân nặng.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Chiều cao (cm)</label>
            <input type="number" value={profile.height} onChange={(e) => setProfile({ ...profile, height: e.target.value })} placeholder="VD: 170"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Tuổi</label>
            <input type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} placeholder="VD: 25"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Giới tính</label>
            <select value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Mức độ vận động</label>
            <select value={profile.activity} onChange={(e) => setProfile({ ...profile, activity: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
              {Object.entries(ACTIVITY_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Cân nặng mong muốn (kg)</label>
            <input type="number" step="0.1" value={profile.targetWeight} onChange={(e) => setProfile({ ...profile, targetWeight: e.target.value })} placeholder="VD: 65"
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
      </div>

      {/* Goal selection */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Mục tiêu</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { key: "lose" as const, label: "Giảm cân", desc: "Thâm hụt 500 kcal/ngày" },
            { key: "maintain" as const, label: "Duy trì", desc: "Giữ nguyên cân nặng" },
            { key: "gain" as const, label: "Tăng cân", desc: "Thặng dư 500 kcal/ngày" },
          ].map((g) => (
            <button key={g.key} onClick={() => setGoal(g.key)}
              className={`rounded-xl border p-4 text-left transition-all ${goal === g.key ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}>
              <div className="text-sm font-semibold text-foreground">{g.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {hasData && (
        <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-6">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Kết quả</h2>

          {/* BMI */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div>
              <div className="text-xs text-muted-foreground">BMI (Chỉ số khối cơ thể)</div>
              <div className={`text-2xl font-bold tracking-tight ${bmiInfo!.color}`}>{bmi.toFixed(1)}</div>
            </div>
            <div className={`text-sm font-medium ${bmiInfo!.color}`}>{bmiInfo!.label}</div>
          </div>

          {/* BMR & TDEE */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="text-xs text-muted-foreground">BMR (Trao đổi chất cơ bản)</div>
              <div className="text-xl font-bold tracking-tight">{Math.round(bmr)} <span className="text-sm font-normal text-muted-foreground">kcal/ngày</span></div>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <div className="text-xs text-muted-foreground">TDEE (Tổng năng lượng tiêu thụ)</div>
              <div className="text-xl font-bold tracking-tight">{Math.round(tdee)} <span className="text-sm font-normal text-muted-foreground">kcal/ngày</span></div>
            </div>
          </div>

          {/* Target */}
          <div className="p-5 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Mục tiêu calo/ngày</div>
                <div className="text-3xl font-bold tracking-tight text-primary">{targetCalories} <span className="text-sm font-normal text-muted-foreground">kcal</span></div>
              </div>
              <Flame className="h-8 w-8 text-primary/40" />
            </div>
            {weeksToGoal !== null && weeksToGoal > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Ước tính đạt cân nặng mong muốn ({profile.targetWeight} kg) sau ~{Math.round(weeksToGoal)} tuần ({(weeksToGoal / 4.33).toFixed(1)} tháng) với tốc độ 0.5 kg/tuần.
              </p>
            )}
          </div>

          <button onClick={saveProfile} disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Đang lưu..." : "Lưu & cập nhật mục tiêu calo"} {saved && "✓"}
          </button>
        </div>
      )}
    </div>
  );
}
