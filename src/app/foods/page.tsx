"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, Apple, Flame, Wheat, Droplet } from "lucide-react";
import { removeDiacritics } from "@/lib/normalize";

interface Food { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; isCustom: boolean; userId: string | null; }

export default function FoodsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", servingSize: "" });
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");

  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  async function loadAll() {
    setLoading(true);
    const res = await fetch("/api/foods");
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setAllFoods(data.foods || []);
    setLoading(false);
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAll(); }, []);

  // Debounce search input
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [debouncedQ]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  // Client-side filter with accent normalization
  const filteredFoods = debouncedQ.trim()
    ? allFoods.filter((f) => removeDiacritics(f.name).includes(removeDiacritics(debouncedQ)))
    : allFoods;
  const totalPages = Math.max(1, Math.ceil(filteredFoods.length / pageSize));
  const foods = filteredFoods.slice((page - 1) * pageSize, page * pageSize);

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
    loadAll();
  }
  async function deleteFood(id: string) { await fetch(`/api/foods/${id}`, { method: "DELETE" }); loadAll(); }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Thư viện</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Món ăn</h1>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <h2 className="text-sm font-semibold text-foreground">Thêm món ăn mới</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Tạo món tuỳ chỉnh với thông tin dinh dưỡng của bạn.</p>
        <form onSubmit={addFood} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input placeholder="Tên món *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring lg:col-span-2" />
          <input type="number" placeholder="Calo *" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input placeholder="Khẩu phần (vd 100g)" value={form.servingSize} onChange={(e) => setForm({ ...form, servingSize: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="number" placeholder="Protein (g)" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="number" placeholder="Carbs (g)" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <input type="number" placeholder="Fat (g)" value={form.fat} onChange={(e) => setForm({ ...form, fat: e.target.value })}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <button type="submit" disabled={adding}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
            <Plus className="h-4 w-4" /> {adding ? "Đang thêm..." : "Thêm món"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Danh sách món ăn <span className="text-muted-foreground font-normal">({filteredFoods.length})</span></h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Tìm kiếm..." value={q} onChange={(e) => setQ(e.target.value)}
              className="w-full sm:w-64 rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 skeleton" />)}</div>
        ) : foods.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Apple className="h-6 w-6" /></span>
            <h3 className="mt-4 text-sm font-semibold text-foreground">Không tìm thấy món nào</h3>
            <p className="mt-1 text-xs text-muted-foreground">Thử từ khoá khác hoặc thêm món mới ở biểu mẫu phía trên.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border/60">
              {foods.map((f) => (
                <li key={f.id} className="group flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Apple className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {f.name}
                        {f.isCustom && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">của bạn</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-rose-500" />{f.calories} kcal</span>
                        {f.servingSize && <span>· {f.servingSize}</span>}
                        <span className="hidden sm:inline">· P {f.protein}g · C {f.carbs}g · F {f.fat}g</span>
                      </div>
                    </div>
                  </div>
                  {f.userId && (
                    <button onClick={() => deleteFood(f.id)} aria-label="Xoá"
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                  ← Trước
                </button>
                <span className="text-xs text-muted-foreground">
                  Trang {page} / {totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                  Sau →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
