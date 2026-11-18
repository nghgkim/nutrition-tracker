"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils, RefreshCw, Star, MapPin, ExternalLink, AlertCircle, ChefHat, Navigation, CalendarRange, Plus, Check, ChevronDown } from "lucide-react";
import { createGenerationGuard } from "@/lib/request-guard";
import { selectDayMeals, todayPlanIndex } from "@/lib/meal-plan";

interface Dish { name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; source: string; }
interface Suggestion { dish: Dish; reason: string; }
interface Restaurant { id: string; name: string; address: string; rating: number; photoUrl: string | null; url: string; distanceKm?: number|null; priceMin?: number|null; priceMax?: number|null; district?: string|null; openHours?: string|null; }
interface MealDay { day: number; label: string; meals: { name: string; calories: number; source: string }[]; total: number; }
interface WteData { goal: number; eaten: number; remaining: number; suggestions: Suggestion[]; }

type Tab = "suggest" | "restaurants";
const TABS: { id: Tab; label: string; icon: typeof ChefHat }[] = [
  { id: "suggest", label: "Gợi ý", icon: ChefHat },
  { id: "restaurants", label: "Quán ăn", icon: Utensils },
];
const PAGE_SIZE = 9;
const fmt = (n:number)=>new Intl.NumberFormat("vi-VN").format(n)+"₫";

export default function WhatToEatPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("suggest");
  const [data, setData] = useState<WteData | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [plan, setPlan] = useState<MealDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<{lat:number;lon:number}|null>(null);
  const [district, setDistrict] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [applied, setApplied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Discard out-of-order filter responses and cancel their network requests.
  const guard = useRef(createGenerationGuard());
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const loadWte = useCallback(async () => {
    const res = await fetch("/api/what-to-eat");
    if (res.status === 401) { router.push("/login"); return; }
    setData(await res.json());
  }, [router]);

  const loadRestaurants = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = guard.current.next();
    setVisibleCount(PAGE_SIZE);
    const p = new URLSearchParams();
    if (geo) { p.set("lat",String(geo.lat)); p.set("lon",String(geo.lon)); }
    if (district) p.set("district",district);
    if (maxPrice) p.set("maxPrice",maxPrice);
    try {
      const res = await fetch(`/api/restaurants?${p}`, { signal: controller.signal });
      if (!res.ok) return;
      const result = await res.json();
      if (guard.current.isLatest(generation)) setRestaurants(result.restaurants || []);
    } catch (err) {
      // Aborted or failed request: keep the last valid list, never show stale data as new.
      if ((err as Error).name !== "AbortError") console.error("restaurant fetch failed", err);
    }
  }, [geo, district, maxPrice]);

  useEffect(() => {
    Promise.all([
      loadWte(),
      fetch("/api/meal-plan/weekly").then(r => r.json()).then(d => setPlan(d.week || [])),
    ]).finally(() => setLoading(false));
  }, [loadWte]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  function askLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeo(null),
      { timeout: 10000 }
    );
  }

  const todayIndex = todayPlanIndex();
  const todayDay = plan.find(d => d.day === todayIndex);
  const todayMeals = selectDayMeals(plan, todayIndex);
  const todayTotal = todayMeals.reduce((s, m) => s + m.calories, 0);

  async function confirmApply() {
    setApplyError("");
    const res = await fetch("/api/meal-plan/weekly/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meals: todayMeals }),
    });
    if (!res.ok) { setApplyError("Không thể thêm món vào nhật ký. Vui lòng thử lại."); return; }
    setConfirming(false);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
    loadWte();
  }

  if (loading || !data) return <div className="max-w-5xl mx-auto px-4 py-6"><div className="h-96 skeleton rounded-2xl" /></div>;

  const visible = restaurants.slice(0, visibleCount);
  const remaining = restaurants.length - visible.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gợi ý</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hôm nay ăn gì?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dựa trên calo còn lại: <span className="font-semibold text-primary">{Math.round(data.remaining)} kcal</span> (đã ăn {Math.round(data.eaten)} / {data.goal})</p>
      </div>

      {/* Two tabs: food ideas and places. Similar content stays inside "Gợi ý". */}
      <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Hôm nay ăn gì">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} role="tab" aria-selected={active} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                active ? "bg-card text-foreground shadow-sm elevated" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: dish suggestions + weekly plan */}
      {activeTab === "suggest" && (
        <div className="space-y-4" role="tabpanel">
          <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2"><ChefHat className="h-4 w-4 text-primary"/> Món gợi ý từ NIN 2026</h2>
              <button onClick={loadWte} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"><RefreshCw className="h-4 w-4"/> Gợi ý lại</button>
            </div>
            {data.suggestions.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center"><AlertCircle className="h-8 w-8 text-amber-500"/><p className="mt-3 text-sm font-medium">Bạn đã vượt mục tiêu calo hôm nay</p></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {data.suggestions.map((s,i)=>(
                  <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                    <div className="text-sm font-medium text-foreground">{s.dish.name}</div>
                    <div className="text-lg font-bold text-primary">{s.dish.calories} <span className="text-sm font-normal text-muted-foreground">kcal</span></div>
                    <div className="text-xs text-muted-foreground">{s.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold flex items-center gap-2"><CalendarRange className="h-4 w-4 text-sky-500"/> Thực đơn gợi ý 7 ngày</h2>
              <button onClick={() => setConfirming(!confirming)} disabled={todayMeals.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                {applied?<><Check className="h-4 w-4"/> Đã thêm</>:<><Plus className="h-4 w-4"/> Thêm 4 bữa hôm nay</>}
              </button>
            </div>
            {confirming && (
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-2">
                <p className="text-sm font-medium">{todayDay?.label ?? "Hôm nay"} · {todayMeals.length} bữa · tổng {todayTotal} kcal</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {todayMeals.map((m,i)=><li key={i}>{m.name} — {m.calories} kcal</li>)}
                </ul>
                {applyError && <p className="text-xs text-destructive">{applyError}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={confirmApply} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Xác nhận</button>
                  <button onClick={() => { setConfirming(false); setApplyError(""); }} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">Hủy</button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
              {plan.map(d=>(
                <div key={d.day} className={`rounded-xl border p-2.5 space-y-1 ${d.day === todayIndex ? "border-primary/50 bg-primary/5" : "border-border/60"}`}>
                  <div className="text-xs font-semibold text-foreground">{d.label}</div>
                  <div className="text-[10px] font-medium text-primary">{d.total} kcal</div>
                  {d.meals.map((m,i)=><div key={i} className="text-[10px] text-muted-foreground truncate" title={m.name}>{m.name}</div>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: restaurants with race-safe filters + incremental loading */}
      {activeTab === "restaurants" && (
        <div className="space-y-3" role="tabpanel">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Utensils className="h-4 w-4 text-rose-500"/> Quán ăn TP.HCM</h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={askLocation} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"><Navigation className="h-3.5 w-3.5"/> {geo?"Vị trí đã lấy":"Dùng vị trí"}</button>
              <select value={district} onChange={e=>setDistrict(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"><option value="">Mọi quận</option>{["Quận 1","Quận 3","Quận 5","Quận 7","Quận 11","Tân Phú","Bình Thạnh","Thủ Đức","Gò Vấp","Quận 10"].map(d=><option key={d}>{d}</option>)}</select>
              <select value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"><option value="">Mọi giá</option><option value="30000">≤ 30k</option><option value="50000">≤ 50k</option><option value="100000">≤ 100k</option></select>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Nguồn: Foody (dữ liệu công khai, scrape 18/11/2026). Không lưu review hay dữ liệu cá nhân.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visible.map(r=>(
              <div key={r.id} className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
                {r.photoUrl && <img src={r.photoUrl} alt={r.name} className="h-32 w-full object-cover" loading="lazy"/>}
                <div className="p-4 space-y-2">
                  <div className="text-sm font-semibold text-foreground line-clamp-2">{r.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3.5 w-3.5 text-amber-500"/> {r.rating.toFixed(1)}{r.distanceKm!=null&&<> · <MapPin className="h-3 w-3"/>{r.distanceKm}km</>}</div>
                  <div className="text-xs text-muted-foreground">{r.priceMin&&r.priceMax?`${fmt(r.priceMin)} – ${fmt(r.priceMax)}`:"Đang cập nhật"}{r.openHours&&` · ${r.openHours}`}</div>
                  <div className="flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0"/><span className="line-clamp-2">{r.address}</span></div>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Xem trên Foody <ExternalLink className="h-3 w-3"/></a>
                </div>
              </div>
            ))}
            {restaurants.length===0&&<p className="text-sm text-muted-foreground col-span-full text-center py-8">Không tìm thấy quán phù hợp bộ lọc.</p>}
          </div>
          {restaurants.length > 0 && (
            <div className="flex flex-col items-center gap-1 pt-1">
              <span className="text-xs text-muted-foreground">Hiển thị {visible.length} / {restaurants.length} quán</span>
              {remaining > 0 && (
                <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                  Xem thêm ({remaining}) <ChevronDown className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
