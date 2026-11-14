"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Target, Flame, Beef, Wheat, Droplet, Calendar, UtensilsCrossed } from "lucide-react";

interface Food { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; }
interface FoodLog { id: string; quantity: number; mealType: string | null; date: string; food: Food; }
interface Goal { dailyCalories: number; }

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABEL: Record<string, string> = { breakfast: "Bữa sáng", lunch: "Bữa trưa", dinner: "Bữa tối", snack: "Ăn vặt" };
const MEAL_ICON: Record<string, typeof Flame> = { breakfast: Flame, lunch: UtensilsCrossed, dinner: UtensilsCrossed, snack: Flame };

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function DashboardPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ foodId: "", quantity: "1", mealType: "breakfast" });
  const [adding, setAdding] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [goalEditing, setGoalEditing] = useState(false);

  async function load(d: string) {
    if (!d) return;
    setLoading(true);
    const [logsRes, foodsRes, goalRes] = await Promise.all([
      fetch(`/api/logs?date=${d}`), fetch("/api/foods"), fetch("/api/goal"),
    ]);
    if (logsRes.status === 401) { router.push("/login"); return; }
    const logsData = await logsRes.json();
    const foodsData = await foodsRes.json();
    const goalData = await goalRes.json();
    setLogs(logsData.logs || []);
    setFoods(foodsData.foods || []);
    setGoal(goalData.goal);
    setGoalInput(String(goalData.goal?.dailyCalories ?? 2000));
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!date) setDate(todayStr()); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (date) load(date); }, [date]);

  async function addLog(e: React.FormEvent) {
    e.preventDefault();
    if (!form.foodId) return;
    setAdding(true);
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodId: form.foodId, quantity: form.quantity, mealType: form.mealType, date }),
    });
    setForm({ foodId: "", quantity: "1", mealType: form.mealType });
    setAdding(false);
    load(date);
  }

  async function deleteLog(id: string) { await fetch(`/api/logs/${id}`, { method: "DELETE" }); load(date); }

  async function saveGoal() {
    await fetch("/api/goal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dailyCalories: Number(goalInput) }),
    });
    setGoalEditing(false);
    load(date);
  }

  const totalCalories = logs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
  const totalProtein = logs.reduce((s, l) => s + l.food.protein * l.quantity, 0);
  const totalCarbs = logs.reduce((s, l) => s + l.food.carbs * l.quantity, 0);
  const totalFat = logs.reduce((s, l) => s + l.food.fat * l.quantity, 0);
  const goalCal = goal?.dailyCalories ?? 2000;
  const pct = Math.min(100, (totalCalories / goalCal) * 100);
  const over = totalCalories > goalCal;

  if (loading && logs.length === 0 && foods.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-40 skeleton" />
          <div className="h-10 w-40 skeleton" />
        </div>
        <div className="h-48 rounded-2xl skeleton" />
        <div className="h-40 rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tổng quan</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        </div>
        <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="bg-transparent outline-none text-foreground" />
        </label>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated transition-shadow hover:shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Tổng calo · {date}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-4xl font-semibold tracking-tight ${over ? "text-destructive" : "text-foreground"}`}>
                {Math.round(totalCalories).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">/ {goalCal.toLocaleString()} kcal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            {goalEditing ? (
              <div className="flex items-center gap-2">
                <input type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} autoFocus
                  className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring" />
                <button onClick={saveGoal} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98]">Lưu</button>
                <button onClick={() => setGoalEditing(false)} className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">Huỷ</button>
              </div>
            ) : (
              <button onClick={() => setGoalEditing(true)} className="text-xs font-medium text-primary hover:underline">
                Sửa mục tiêu
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${over ? "bg-destructive" : "bg-gradient-to-r from-emerald-500 to-emerald-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(pct)}% mục tiêu</span>
            <span className={over ? "text-destructive font-medium" : ""}>
              {over ? `Vượt ${Math.round(totalCalories - goalCal)} kcal` : `Còn ${Math.round(goalCal - totalCalories)} kcal`}
            </span>
          </div>
        </div>

        {/* Macros */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {[
            { label: "Protein", value: totalProtein, icon: Beef, color: "text-rose-500", bg: "bg-rose-500/10" },
            { label: "Carbs", value: totalCarbs, icon: Wheat, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "Fat", value: totalFat, icon: Droplet, color: "text-sky-500", bg: "bg-sky-500/10" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.bg} ${m.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-semibold text-foreground">{Math.round(m.value)}g</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add log */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <h2 className="text-sm font-semibold text-foreground">Thêm món ăn</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Ghi nhận món bạn vừa ăn vào nhật ký hôm nay.</p>
        <form onSubmit={addLog} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={form.foodId} onChange={(e) => setForm({ ...form, foodId: e.target.value })} required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="">Chọn món...</option>
            {foods.map((f) => (<option key={f.id} value={f.id}>{f.name} — {f.calories} kcal</option>))}
          </select>
          <input type="number" step="0.1" min="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Số phần"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <select value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
            {MEALS.map((m) => (<option key={m} value={m}>{MEAL_LABEL[m]}</option>))}
          </select>
          <button type="submit" disabled={adding || !form.foodId}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
            <Plus className="h-4 w-4" /> {adding ? "Đang thêm..." : "Thêm"}
          </button>
        </form>
        {foods.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Chưa có món ăn nào. <a href="/foods" className="font-medium text-primary hover:underline">Thêm món ăn đầu tiên</a>
          </p>
        )}
      </div>

      {/* Meal groups */}
      <div className="space-y-4">
        {MEALS.map((m) => {
          const mealLogs = logs.filter((l) => l.mealType === m);
          if (mealLogs.length === 0) return null;
          const mealCal = mealLogs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
          const Icon = MEAL_ICON[m];
          return (
            <div key={m} className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{MEAL_LABEL[m]}</h3>
                  <span className="text-xs text-muted-foreground">· {mealLogs.length} món</span>
                </div>
                <span className="text-sm font-semibold text-primary">{Math.round(mealCal)} kcal</span>
              </div>
              <ul className="divide-y divide-border/60">
                {mealLogs.map((l) => (
                  <li key={l.id} className="group flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/40">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{l.food.name}</div>
                      <div className="text-xs text-muted-foreground">
                        × {l.quantity} {l.food.servingSize ? `· ${l.food.servingSize}` : ""} · {l.food.calories} kcal/phần
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{Math.round(l.food.calories * l.quantity)} kcal</span>
                      <button onClick={() => deleteLog(l.id)} aria-label="Xoá"
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
            <div className="border-b border-border/60 px-5 py-3"><h3 className="text-sm font-semibold text-foreground">Khác</h3></div>
            <ul className="divide-y divide-border/60">
              {logs.filter((l) => !MEALS.includes(l.mealType as typeof MEALS[number])).map((l) => (
                <li key={l.id} className="group flex items-center justify-between px-5 py-3 hover:bg-muted/40">
                  <div className="text-sm font-medium text-foreground">{l.food.name} <span className="text-muted-foreground">× {l.quantity}</span></div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{Math.round(l.food.calories * l.quantity)} kcal</span>
                    <button onClick={() => deleteLog(l.id)} className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UtensilsCrossed className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-foreground">Chưa có món nào trong ngày này</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Bắt đầu bằng cách chọn món ăn ở biểu mẫu phía trên, hoặc thêm món mới trong mục &ldquo;Món ăn&rdquo;.
            </p>
            <a href="/foods" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]">
              <Plus className="h-3.5 w-3.5" /> Thêm món ăn
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
