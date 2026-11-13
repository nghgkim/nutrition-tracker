"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Food {
  id: string; name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null;
}
interface FoodLog { id: string; quantity: number; mealType: string | null; date: string; food: Food; }
interface Goal { dailyCalories: number; }

const MEALS = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABEL: Record<string, string> = { breakfast: "Bữa sáng", lunch: "Bữa trưa", dinner: "Bữa tối", snack: "Ăn vặt" };

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
    load(date);
  }

  const totalCalories = logs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
  const totalProtein = logs.reduce((s, l) => s + l.food.protein * l.quantity, 0);
  const totalCarbs = logs.reduce((s, l) => s + l.food.carbs * l.quantity, 0);
  const totalFat = logs.reduce((s, l) => s + l.food.fat * l.quantity, 0);
  const goalCal = goal?.dailyCalories ?? 2000;
  const pct = Math.min(100, (totalCalories / goalCal) * 100);

  if (loading && !logs.length) return <p className="text-center py-10">Đang tải...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2" />
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-baseline">
          <span className="text-gray-500 text-sm">Tổng calo ngày {date}</span>
          <span className="text-3xl font-bold text-green-600">{Math.round(totalCalories)} kcal</span>
        </div>
        <div className="mt-3 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${pct >= 100 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm text-gray-500">
          <span>Mục tiêu: {goalCal} kcal</span><span>{Math.round(pct)}%</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div><div className="font-semibold">{Math.round(totalProtein)}g</div><div className="text-gray-500">Protein</div></div>
          <div><div className="font-semibold">{Math.round(totalCarbs)}g</div><div className="text-gray-500">Carbs</div></div>
          <div><div className="font-semibold">{Math.round(totalFat)}g</div><div className="text-gray-500">Fat</div></div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} className="border rounded px-3 py-1 w-24" />
          <button onClick={saveGoal} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded">Cập nhật mục tiêu</button>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-3">Thêm món ăn</h2>
        <form onSubmit={addLog} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={form.foodId} onChange={(e) => setForm({ ...form, foodId: e.target.value })} className="border rounded px-3 py-2" required>
            <option value="">Chọn món...</option>
            {foods.map((f) => (<option key={f.id} value={f.id}>{f.name} ({f.calories} kcal{f.servingSize ? "/" + f.servingSize : ""})</option>))}
          </select>
          <input type="number" step="0.1" min="0.1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="border rounded px-3 py-2" placeholder="Số phần" />
          <select value={form.mealType} onChange={(e) => setForm({ ...form, mealType: e.target.value })} className="border rounded px-3 py-2">
            {MEALS.map((m) => (<option key={m} value={m}>{MEAL_LABEL[m]}</option>))}
          </select>
          <button type="submit" disabled={adding} className="bg-green-600 text-white rounded px-3 py-2 hover:bg-green-700 disabled:opacity-50">
            {adding ? "Đang thêm..." : "Thêm"}
          </button>
        </form>
        {foods.length === 0 && (<p className="text-sm text-gray-500 mt-2">Chưa có món ăn nào. <a href="/foods" className="text-green-600">Thêm món ăn</a></p>)}
      </div>
      <div className="space-y-4">
        {MEALS.map((m) => {
          const mealLogs = logs.filter((l) => l.mealType === m);
          if (mealLogs.length === 0) return null;
          const mealCal = mealLogs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
          return (
            <div key={m} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold">{MEAL_LABEL[m]}</h3>
                <span className="text-green-600 font-medium">{Math.round(mealCal)} kcal</span>
              </div>
              <ul className="divide-y">
                {mealLogs.map((l) => (
                  <li key={l.id} className="py-2 flex justify-between items-center">
                    <div><span className="font-medium">{l.food.name}</span><span className="text-gray-500 text-sm ml-2">× {l.quantity}</span></div>
                    <div className="flex items-center gap-3">
                      <span>{Math.round(l.food.calories * l.quantity)} kcal</span>
                      <button onClick={() => deleteLog(l.id)} className="text-red-500 text-sm hover:text-red-700">Xoá</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {logs.filter((l) => !MEALS.includes(l.mealType || "")).length > 0 && (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">Khác</h3>
            <ul className="divide-y">
              {logs.filter((l) => !MEALS.includes(l.mealType || "")).map((l) => (
                <li key={l.id} className="py-2 flex justify-between items-center">
                  <div><span className="font-medium">{l.food.name}</span><span className="text-gray-500 text-sm ml-2">× {l.quantity}</span></div>
                  <div className="flex items-center gap-3">
                    <span>{Math.round(l.food.calories * l.quantity)} kcal</span>
                    <button onClick={() => deleteLog(l.id)} className="text-red-500 text-sm hover:text-red-700">Xoá</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {logs.length === 0 && (<p className="text-center text-gray-500 py-6">Chưa có món nào trong ngày này.</p>)}
      </div>
    </div>
  );
}
