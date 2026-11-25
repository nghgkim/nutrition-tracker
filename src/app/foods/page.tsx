"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, Apple, Flame, Download } from "lucide-react";
import { removeDiacritics } from "@/lib/normalize";
import { prefillFoodName } from "@/lib/food-suggest";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/ToastProvider";

interface Food { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; isCustom: boolean; userId: string | null; }
interface ImportCandidate { name: string; restaurant_name: string | null; source: string; source_id: string; price: number | null; image_url: string | null; external_url: string | null; suggestion: { calories: number; protein: number; carbs: number; fat: number; servingSize: string | null } | null; }

export default function FoodsPage() {
  const t = useT();
  const { success, error: showError } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", servingSize: "", source: "" });
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importQ, setImportQ] = useState("");
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [importError, setImportError] = useState("");
  type SearchItem = { id: string; name: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; servingSize: string | null; source: string | null };
  const [suggestions, setSuggestions] = useState<{ source: string; items: SearchItem[] }[]>([]);
  const [suggestError, setSuggestError] = useState("");
  const suggestKey = useRef("");

  const [allFoods, setAllFoods] = useState<Food[]>([]);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const loadAll = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/foods");
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setAllFoods(data.foods || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    const name = form.name.trim();
    if (name.length < 2) { setSuggestions([]); setSuggestError(""); return; }
    const key = name;
    suggestKey.current = key;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/foods/search-all?q=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (suggestKey.current === key) {
          setSuggestions(data.groups || []);
          setSuggestError((data.degraded || []).join(" · "));
        }
      } catch { if (suggestKey.current === key) setSuggestError("Không thể tải gợi ý"); }
    }, 250);
    return () => clearTimeout(timer);
  }, [form.name]);

  async function loadCandidates() {
    setLoadingCandidates(true);
    setImportError("");
    try {
      const res = await fetch(`/api/foods/import-candidates?q=${encodeURIComponent(importQ)}`);
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Không thể tải dữ liệu crawler");
        setCandidates([]);
        return;
      }
      setCandidates(data.candidates || []);
    } catch {
      setImportError("Không thể tải dữ liệu crawler");
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }

  // Debounce search input
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

  function autofill(food: { name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; source?: string | null }) {
    setForm({
      name: food.name,
      calories: food.calories != null ? String(food.calories) : "",
      protein: food.protein != null ? String(food.protein) : "",
      carbs: food.carbs != null ? String(food.carbs) : "",
      fat: food.fat != null ? String(food.fat) : "",
      servingSize: food.servingSize || "",
      source: food.source || "NIN2026",
    });
    setSuggestions([]);
    success(`Đã điền từ ${food.source || "NIN2026"}: ${food.name} (có thể chỉnh trước khi lưu)`);
  }

  function openAddWith(name: string) {
    const prefilled = prefillFoodName(name);
    setForm({ name: prefilled, calories: "", protein: "", carbs: "", fat: "", servingSize: "", source: "" });
    setShowImport(false);
    setShowForm(true);
  }

  async function addFood(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, calories: Number(form.calories), protein: Number(form.protein || 0), carbs: Number(form.carbs || 0), fat: Number(form.fat || 0), servingSize: form.servingSize || null, source: form.source || null }),
    });
    if (res.ok) {
      success(`Đã thêm món "${form.name}"`);
      setForm({ name: "", calories: "", protein: "", carbs: "", fat: "", servingSize: "", source: "" });
      loadAll();
    } else showError("Không thể thêm món. Kiểm tra lại thông tin.");
    setAdding(false);
  }
  async function deleteFood(id: string) { const res = await fetch(`/api/foods/${id}`, { method: "DELETE" }); if (res.ok) { success("Đã xoá món"); loadAll(); } else showError("Không thể xoá món."); }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("library")}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("foods")}</h1>
      </div>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowImport(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-border/60 bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Nhập món từ Food Crawler</h2>
              <button onClick={() => setShowImport(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors">✕</button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Dữ liệu từ Foody/Google Places. Dinh dưỡng chỉ được gợi ý khi trùng tên với thư viện VFCT2007; hãy kiểm tra trước khi lưu.
            </p>
            <div className="flex gap-2 mb-3">
              <input placeholder="Tìm món..." value={importQ} onChange={(e) => setImportQ(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
              <button onClick={() => loadCandidates()} disabled={loadingCandidates}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {loadingCandidates ? "Đang tải..." : "Tìm"}
              </button>
            </div>
            {importError && <p className="text-xs text-destructive mb-3">{importError}</p>}
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {candidates.length === 0 && !loadingCandidates && (
                <div className="py-6 text-center space-y-3">
                  <p className="text-xs text-muted-foreground">Không có món nào để nhập.</p>
                  <button onClick={() => openAddWith(importQ)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground active:scale-[0.98]">
                    <Plus className="h-4 w-4" /> {prefillFoodName(importQ) ? `Thêm món "${prefillFoodName(importQ)}"` : "Thêm món mới"}
                  </button>
                </div>
              )}
              {candidates.map((c, i) => (
                <div key={`${c.source}-${c.source_id}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{c.name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {c.restaurant_name || c.source}
                      {c.price ? ` · ${c.price.toLocaleString("vi-VN")}đ` : ""}
                      {" · "}
                      {c.suggestion ? `Gợi ý ${c.suggestion.calories} kcal` : "Chưa có gợi ý dinh dưỡng"}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setForm({
                        name: c.name,
                        calories: c.suggestion ? String(c.suggestion.calories) : "",
                        protein: c.suggestion ? String(c.suggestion.protein) : "",
                        carbs: c.suggestion ? String(c.suggestion.carbs) : "",
                        fat: c.suggestion ? String(c.suggestion.fat) : "",
                        servingSize: c.suggestion?.servingSize || "1 phần",
                        source: c.suggestion ? "Foody→NIN2026" : "",
                      });
                      setShowImport(false);
                      setShowForm(true);
                    }}
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                    Dùng
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Thêm món ăn mới</h2>
              <button onClick={() => setShowForm(false)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors">✕</button>
            </div>
            <form onSubmit={addFood} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Tên món *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring lg:col-span-2" />
          {(suggestions.length > 0 || suggestError) && (
            <div className="lg:col-span-2 rounded-lg border border-border/60 bg-muted/30 p-2 space-y-2 max-h-64 overflow-y-auto">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tìm kiếm đa nguồn · calo tính trên {form.servingSize || "100g"}</p>
              {suggestError && <p className="text-xs text-amber-600">{suggestError}</p>}
              {suggestions.map(group => (
                <div key={group.source} className="space-y-1">
                  <p className="text-[10px] font-semibold text-primary">{group.source} {group.items.length > 0 && `(${group.items.length})`}</p>
                  {group.items.map(f => (
                    <button key={f.id} type="button" onClick={() => autofill(f as Parameters<typeof autofill>[0])}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-left text-xs hover:bg-muted active:scale-[0.98]">
                      <span className="min-w-0 truncate font-medium text-foreground">{f.name}</span>
                      <span className="shrink-0 font-mono text-muted-foreground">{f.calories != null ? `${f.calories} kcal` : "—"}{f.servingSize ? ` · ${f.servingSize}` : ""}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
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
            className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
            <Plus className="h-4 w-4" /> {adding ? "Đang thêm..." : "Thêm món"}
          </button>
        </form>
      </div>
      </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-card px-5 py-2">
          <h2 className="text-sm font-semibold text-foreground">Món ăn <span className="text-muted-foreground font-normal text-xs">({filteredFoods.length})</span></h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Tìm..." value={q} onChange={(e) => setQ(e.target.value)}
                className="w-full sm:w-56 rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <button onClick={() => { setShowImport(true); setImportQ(""); setCandidates([]); loadCandidates(); }}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted active:scale-[0.98]">
              <Download className="h-3.5 w-3.5" /> Nhập từ Crawler
            </button>
            <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]">
              <Plus className="h-3.5 w-3.5" /> Thêm
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-12 skeleton" />)}</div>
        ) : foods.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Apple className="h-6 w-6" /></span>
            <h3 className="mt-4 text-sm font-semibold text-foreground">Không tìm thấy món nào</h3>
            <p className="mt-1 text-xs text-muted-foreground">Thử từ khoá khác, hoặc thêm món này vào thư viện.</p>
            <button onClick={() => openAddWith(debouncedQ)} className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground active:scale-[0.98]">
              <Plus className="h-4 w-4" /> {prefillFoodName(debouncedQ) ? `Thêm món "${prefillFoodName(debouncedQ)}"` : "Thêm món mới"}
            </button>
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
