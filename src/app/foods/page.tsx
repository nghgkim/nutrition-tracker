"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Food { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; isCustom: boolean; userId: string | null; }

export default function FoodsPage() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", servingSize: "" });
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/foods${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setFoods(data.foods || []);
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [q]);

  async function addFood(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    await fetch("/api/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, calories: Number(form.calories), protein: Number(form.protein || 0), carbs: Number(form.carbs || 0), fat: Number(form.fat || 0), servingSize: form.servingSize || null }),
    });
    setForm({ name: "", calories: "", protein: "", carbs: "", fat: "", servingSize: "" });
    setAdding(false);
    load();
  }
  async function deleteFood(id: string) { await fetch(`/api/foods/${id}`, { method: "DELETE" }); load(); }

  if (loading) return <p className="text-center py-10">Đang tải...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Món ăn</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-3">Thêm món ăn mới</h2>
        <form onSubmit={addFood} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input placeholder="Tên món *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2 col-span-2" required />
          <input type="number" placeholder="Calo *" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} className="border rounded px-3 py-2" required />
          <input placeholder="Khẩu phần (vd 100g)" value={form.servingSize} onChange={(e) => setForm({ ...form, servingSize: e.target.value })} className="border rounded px-3 py-2" />
          <input type="number" placeholder="Protein (g)" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} className="border rounded px-3 py-2" />
          <input type="number" placeholder="Carbs (g)" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })} className="border rounded px-3 py-2" />
          <input type="number" placeholder="Fat (g)" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })} className="border rounded px-3 py-2" />
          <button type="submit" disabled={adding} className="bg-green-600 text-white rounded px-3 py-2 hover:bg-green-700 disabled:opacity-50">
            {adding ? "Đang thêm..." : "Thêm"}
          </button>
        </form>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Danh sách món ăn</h2>
          <input placeholder="Tìm kiếm..." value={q} onChange={(e) => setQ(e.target.value)} className="border rounded px-3 py-1 text-sm" />
        </div>
        <ul className="divide-y">
          {foods.map((f) => (
            <li key={f.id} className="py-3 flex justify-between items-center">
              <div>
                <div className="font-medium">{f.name} {f.isCustom && <span className="text-xs text-gray-400">(của bạn)</span>}</div>
                <div className="text-sm text-gray-500">{f.calories} kcal{f.servingSize ? " / " + f.servingSize : ""} · P:{f.protein}g C:{f.carbs}g F:{f.fat}g</div>
              </div>
              {f.userId && (<button onClick={() => deleteFood(f.id)} className="text-red-500 text-sm hover:text-red-700">Xoá</button>)}
            </li>
          ))}
          {foods.length === 0 && <p className="text-gray-500 py-4 text-center">Không tìm thấy món nào.</p>}
        </ul>
      </div>
    </div>
  );
}
