/* eslint-disable react-hooks/set-state-in-effect */
"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils, RefreshCw, Star, MapPin, ExternalLink, AlertCircle, ChefHat, Navigation, SlidersHorizontal, CalendarRange, Plus, Check } from "lucide-react";

interface Dish { name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; source: string; }
interface Suggestion { dish: Dish; reason: string; }
interface Restaurant { id: string; name: string; address: string; rating: number; photoUrl: string | null; url: string; distanceKm?: number|null; priceMin?: number|null; priceMax?: number|null; district?: string|null; openHours?: string|null; }
interface MealDay { day: number; label: string; meals: { name: string; calories: number; source: string }[]; total: number; }
interface WteData { goal: number; eaten: number; remaining: number; suggestions: Suggestion[]; }
const fmt = (n:number)=>new Intl.NumberFormat("vi-VN").format(n)+"₫";

export default function WhatToEatPage() {
  const router = useRouter();
  const [data, setData] = useState<WteData | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [plan, setPlan] = useState<MealDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<{lat:number;lon:number}|null>(null);
  const [district, setDistrict] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [applied, setApplied] = useState(false);

  const loadWte = useCallback(async () => {
    const res = await fetch("/api/what-to-eat");
    if (res.status === 401) { router.push("/login"); return; }
    setData(await res.json());
  }, [router]);

  const loadRestaurants = useCallback(async () => {
    const p = new URLSearchParams();
    if (geo) { p.set("lat",String(geo.lat)); p.set("lon",String(geo.lon)); }
    if (district) p.set("district",district);
    if (maxPrice) p.set("maxPrice",maxPrice);
    const res = await fetch(`/api/restaurants?${p}`);
    if (res.ok) setRestaurants((await res.json()).restaurants || []);
  }, [geo, district, maxPrice]);

  useEffect(() => {
    Promise.all([loadWte(), fetch("/api/meal-plan/weekly").then(r=>r.json()).then(d=>setPlan(d.week||[])), loadRestaurants()])
      .finally(()=>setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadRestaurants(); }, [loadRestaurants]);

  function askLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setGeo(null)
    );
  }

  async function applyPlan() {
    const meals = plan.flatMap(d => d.meals).filter(m=>m.name!=="—");
    const res = await fetch("/api/meal-plan/weekly/apply", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ meals }) });
    if (res.ok) { setApplied(true); setTimeout(()=>setApplied(false),2500); loadWte(); }
  }

  if (loading || !data) return <div className="max-w-5xl mx-auto px-4 py-6"><div className="h-96 skeleton rounded-2xl" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gợi ý</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hôm nay ăn gì?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dựa trên calo còn lại: <span className="font-semibold text-primary">{Math.round(data.remaining)} kcal</span> (đã ăn {Math.round(data.eaten)} / {data.goal})</p>
      </div>

      {/* Dish suggestions */}
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

      {/* Weekly meal plan */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold flex items-center gap-2"><CalendarRange className="h-4 w-4 text-sky-500"/> Thực đơn gợi ý 7 ngày</h2>
          <button onClick={applyPlan} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{applied?<><Check className="h-4 w-4"/> Đã thêm</>:<><Plus className="h-4 w-4"/> Thêm tất cả vào nhật ký</>}</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {plan.map(d=>(
            <div key={d.day} className="rounded-xl border border-border/60 p-2.5 space-y-1">
              <div className="text-xs font-semibold text-foreground">{d.label}</div>
              <div className="text-[10px] font-medium text-primary">{d.total} kcal</div>
              {d.meals.map((m,i)=><div key={i} className="text-[10px] text-muted-foreground truncate" title={m.name}>{m.name}</div>)}
            </div>
          ))}
        </div>
      </div>

      {/* Restaurants with geo/price filters */}
      <div className="space-y-3">
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
          {restaurants.map(r=>(
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
      </div>
    </div>
  );
}
