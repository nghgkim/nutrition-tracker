"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Target, Flame, Beef, Wheat, Droplet, Calendar, UtensilsCrossed, ChevronLeft, ChevronRight, Sparkles, Download } from "lucide-react";

interface Food { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; }
interface FoodLog { id: string; quantity: number; mealType: string | null; date: string; food: Food; }
interface Goal { dailyCalories: number; }

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABEL: Record<string, string> = { breakfast: "Bữa sáng", lunch: "Bữa trưa", dinner: "Bữa tối", snack: "Ăn vặt" };
const MEAL_EMOJI: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍪" };

function todayStr() { return new Date().toISOString().slice(0, 10); }
function shiftDate(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10);
}

// Circular progress ring
function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const pct = Math.min(100, (consumed / goal) * 100);
  const over = consumed > goal;
  const r = 72; const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
        <circle cx="90" cy="90" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          className={`transition-all duration-700 ease-out ${over ? "stroke-destructive" : "stroke-primary"}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold tracking-tight ${over ? "text-destructive" : "text-foreground"}`}>
          {Math.round(consumed).toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">/ {goal.toLocaleString()} kcal</span>
        <span className={`mt-1 text-[11px] font-medium ${over ? "text-destructive" : "text-primary"}`}>
          {over ? `+${Math.round(consumed - goal)} vượt` : `${Math.round(goal - consumed)} còn lại`}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [today, setToday] = useState("");
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ foodId: "", quantity: "1", mealType: "breakfast" });
  const [adding, setAdding] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goalEditing, setGoalEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  async function load(d: string) {
    if (!d) return;
    setLoading(true);
    try {
      const [logsRes, foodsRes, goalRes] = await Promise.all([
        fetch(`/api/logs?date=${d}`), fetch("/api/foods"), fetch("/api/goal"),
      ]);
      if (logsRes.status === 401 || foodsRes.status === 401 || goalRes.status === 401) {
        router.push("/login");
        return;
      }
      const logsData = logsRes.ok ? await logsRes.json() : { logs: [] };
      const foodsData = foodsRes.ok ? await foodsRes.json() : { foods: [] };
      const goalData = goalRes.ok ? await goalRes.json() : { goal: null };
      setLogs(logsData.logs || []);
      setFoods(foodsData.foods || []);
      setGoal(goalData.goal);
      setGoalInput(String(goalData.goal?.dailyCalories ?? 2000));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const t = todayStr(); setToday(t); if (!date) setDate(t); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (date) load(date); }, [date]);

  async function addLog(e: React.FormEvent) {
    e.preventDefault();
    if (!form.foodId) return;
    setAdding(true);
    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodId: form.foodId, quantity: form.quantity, mealType: form.mealType, date }),
    });
    setAdding(false);
    if (res.ok) {
      const food = foods.find(f => f.id === form.foodId);
      showToast(`Đã thêm ${food?.name ?? "món ăn"}`);
      setForm({ foodId: "", quantity: "1", mealType: form.mealType });
      load(date);
    }
  }

  async function deleteLog(id: string, name: string) {
    await fetch(`/api/logs/${id}`, { method: "DELETE" });
    showToast(`Đã xoá ${name}`);
    load(date);
  }

  async function saveGoal() {
    await fetch("/api/goal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyCalories: Number(goalInput) }),
    });
    setGoalEditing(false);
    showToast("Đã cập nhật mục tiêu");
    load(date);
  }

  const totalCalories = logs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
  const totalProtein = logs.reduce((s, l) => s + l.food.protein * l.quantity, 0);
  const totalCarbs = logs.reduce((s, l) => s + l.food.carbs * l.quantity, 0);
  const totalFat = logs.reduce((s, l) => s + l.food.fat * l.quantity, 0);
  const goalCal = goal?.dailyCalories ?? 2000;
  const isToday = date !== "" && date === today;

  // Loading state handled inline; no full-page skeleton to avoid stuck UI

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
            <Sparkles className="h-4 w-4" /> {toast}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tổng quan</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        </div>
        <div className="inline-flex items-center rounded-lg border border-border bg-card shadow-sm">
          <button onClick={() => setDate(shiftDate(date, -1))} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <label className="flex items-center gap-2 px-3 py-2 text-sm border-x border-border">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none text-foreground" />
          </label>
          <button onClick={() => setDate(shiftDate(date, 1))} disabled={isToday} className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: calorie ring + macros */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-6 elevated flex flex-col items-center">
            <CalorieRing consumed={totalCalories} goal={goalCal} />
            <div className="mt-4 w-full space-y-3">
              {[
                { label: "Protein", value: totalProtein, goal: 150, color: "bg-rose-500", track: "bg-rose-500/15", icon: Beef },
                { label: "Carbs", value: totalCarbs, goal: 250, color: "bg-amber-500", track: "bg-amber-500/15", icon: Wheat },
                { label: "Fat", value: totalFat, goal: 70, color: "bg-sky-500", track: "bg-sky-500/15", icon: Droplet },
              ].map((m) => {
                const Icon = m.icon;
                const pct = Math.min(100, (m.value / m.goal) * 100);
                return (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {m.label}</span>
                      <span className="font-medium text-foreground">{Math.round(m.value)}g <span className="text-muted-foreground font-normal">/ {m.goal}g</span></span>
                    </div>
                    <div className={`h-1.5 w-full rounded-full ${m.track}`}>
                      <div className={`h-full rounded-full ${m.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 w-full border-t border-border/60 pt-4">
              {goalEditing ? (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <input type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} autoFocus
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring" />
                  <button onClick={saveGoal} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98]">Lưu</button>
                  <button onClick={() => setGoalEditing(false)} className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">Huỷ</button>
                </div>
              ) : (
                <button onClick={() => setGoalEditing(true)} className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <span className="flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Mục tiêu calo</span>
                  <span className="font-medium text-foreground">{goalCal.toLocaleString()} kcal · Sửa</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: add form + meals */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add form */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 elevated">
            <form onSubmit={addLog} className="flex flex-col sm:flex-row gap-2">
              <select value={form.foodId} onChange={(e) => setForm({ ...form, foodId: e.target.value })} required
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">Chọn món ăn...</option>
                {foods.map((f) => (<option key={f.id} value={f.id}>{f.name} — {f.calories} kcal</option>))}
              </select>
              <input type="number" step="0.1" min="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Phần"
                className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <select value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                {MEALS.map((m) => (<option key={m} value={m}>{MEAL_EMOJI[m]} {MEAL_LABEL[m]}</option>))}
              </select>
              <button type="submit" disabled={adding || !form.foodId}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                <Plus className="h-4 w-4" /> {adding ? "..." : "Thêm"}
              </button>
            </form>
            {foods.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Chưa có món ăn. <a href="/foods" className="font-medium text-primary hover:underline">Thêm món ăn đầu tiên →</a>
              </p>
            )}
          </div>

          {/* Meal groups */}
          {MEALS.map((m) => {
            const mealLogs = logs.filter((l) => l.mealType === m);
            if (mealLogs.length === 0) return null;
            const mealCal = mealLogs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
            return (
              <div key={m} className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{MEAL_EMOJI[m]}</span>
                    <h3 className="text-sm font-semibold text-foreground">{MEAL_LABEL[m]}</h3>
                    <span className="text-xs text-muted-foreground">· {mealLogs.length}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{Math.round(mealCal)} kcal</span>
                </div>
                <ul className="divide-y divide-border/60">
                  {mealLogs.map((l) => (
                    <li key={l.id} className="group flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground truncate">{l.food.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          × {l.quantity} {l.food.servingSize ? `· ${l.food.servingSize}` : ""} · {l.food.calories} kcal/phần
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-foreground tabular-nums">{Math.round(l.food.calories * l.quantity)} kcal</span>
                        <button onClick={() => deleteLog(l.id, l.food.name)} aria-label="Xoá"
                          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {logs.filter((l) => !MEALS.includes(l.mealType as typeof MEALS[number])).length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
              <div className="border-b border-border/60 px-5 py-3 bg-muted/30"><h3 className="text-sm font-semibold text-foreground">Khác</h3></div>
              <ul className="divide-y divide-border/60">
                {logs.filter((l) => !MEALS.includes(l.mealType as typeof MEALS[number])).map((l) => (
                  <li key={l.id} className="group flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
                    <div className="text-sm font-medium text-foreground">{l.food.name} <span className="text-muted-foreground">× {l.quantity}</span></div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular-nums">{Math.round(l.food.calories * l.quantity)} kcal</span>
                      <button onClick={() => deleteLog(l.id, l.food.name)} className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UtensilsCrossed className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">Chưa có món nào hôm nay</h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                Chọn món ăn ở biểu mẫu phía trên để bắt đầu ghi nhận. Hoặc thêm món mới trong mục &ldquo;Món ăn&rdquo;.
              </p>
              <a href="/foods" className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]">
                <Plus className="h-4 w-4" /> Thêm món ăn
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
