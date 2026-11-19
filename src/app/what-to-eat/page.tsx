"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils, Star, MapPin, ExternalLink, Navigation, CalendarRange, Plus, Check } from "lucide-react";
import { createGenerationGuard } from "@/lib/request-guard";
import { selectDayMeals, todayPlanIndex, swapMeal, type MealDay } from "@/lib/meal-plan";
import type { Dish } from "@/lib/what-to-eat";
import { pageWindow, totalPages } from "@/lib/pagination";

interface Restaurant { id: string; name: string; address: string; rating: number; photoUrl: string | null; url: string; distanceKm?: number|null; priceMin?: number|null; priceMax?: number|null; district?: string|null; openHours?: string|null; cuisines?: string|null; }
interface WteData { goal: number; eaten: number; remaining: number; }

type Tab = "suggest" | "restaurants";
const TABS: { id: Tab; label: string; icon: typeof Utensils }[] = [
  { id: "suggest", label: "Thực đơn tuần", icon: CalendarRange },
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
  const [candidates, setCandidates] = useState<Dish[]>([]);
  const [swapTarget, setSwapTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<{lat:number;lon:number}|null>(null);
  const [district, setDistrict] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("rating");
  const [applied, setApplied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFloat, setShowFloat] = useState(false);

  // Discard out-of-order filter responses and cancel their network requests.
  const guard = useRef(createGenerationGuard());
  const abortRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<Restaurant[]>([]);
  const latestKeyRef = useRef("");
  useEffect(() => () => abortRef.current?.abort(), []);

  // Floating paging appears after real scrolling, with hysteresis to avoid flicker.
  useEffect(() => {
    if (activeTab !== "restaurants") { setShowFloat(false); return; }
    const onScroll = () => {
      const y = window.scrollY;
      setShowFloat(prev => (prev ? y > 300 : y > 400));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [activeTab]);

  const loadWte = useCallback(async () => {
    const res = await fetch("/api/what-to-eat");
    if (res.status === 401) { router.push("/login"); return; }
    setData(await res.json());
  }, [router]);

  const loadRestaurants = useCallback(async (targetPage = 1) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const generation = guard.current.next();
    const p = new URLSearchParams();
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String((targetPage - 1) * PAGE_SIZE));
    if (geo) { p.set("lat",String(geo.lat)); p.set("lon",String(geo.lon)); }
    if (district) p.set("district",district);
    if (minPrice) p.set("minPrice",minPrice);
    if (maxPrice) p.set("maxPrice",maxPrice);
    if (sort !== "rating") p.set("sort",sort);
    const requestKey = p.toString();
    latestKeyRef.current = requestKey;
    itemsRef.current = [];
    setRestaurants([]);
    try {
      const res = await fetch(`/api/restaurants?${p}`, { signal: controller.signal });
      if (!res.ok) return;
      const result = await res.json();
      if (guard.current.isLatest(generation) && latestKeyRef.current === requestKey) {
        const rows: Restaurant[] = result.restaurants || [];
        itemsRef.current = rows;
        setRestaurants(rows);
        setTotal(result.total || 0);
        setPage(targetPage);
      }
    } catch (err) {
      // Aborted or failed request: keep the last valid list, never show stale data as new.
      if ((err as Error).name !== "AbortError") console.error("restaurant fetch failed", err);
    }
  }, [geo, district, minPrice, maxPrice, sort]);

  useEffect(() => {
    Promise.all([
      loadWte(),
      fetch("/api/meal-plan/weekly").then(r => r.json()).then(d => setPlan(d.week || [])),
      fetch("/api/foods").then(r => r.json()).then(d => setCandidates((d.foods || []).filter((f: Dish & { source?: string }) => f.source?.includes("NIN2026")))),
    ]).finally(() => setLoading(false));
  }, [loadWte]);

  useEffect(() => {
    loadRestaurants(1);
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

  function persistWeek(next: MealDay[]) {
    setPlan(next);
    fetch("/api/meal-plan/weekly", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: next }),
    }).then(res => { if (!res.ok) setApplyError("Không thể lưu món đã đổi."); });
  }

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 space-y-3">
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

      {/* Tab 1: weekly plan only — random NIN dish suggestions removed */}
      {activeTab === "suggest" && (
        <div className="space-y-4" role="tabpanel">
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
                  {d.meals.map((m,i) => (
                    <div key={i} className="space-y-0.5">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] text-muted-foreground truncate" title={m.name}>{m.name}{m.servingSize ? ` · ${m.servingSize}` : ""}</span>
                        <button onClick={() => setSwapTarget(swapTarget === `${d.day}-${i}` ? null : `${d.day}-${i}`)}
                          aria-label={`Đổi món ${m.name}`}
                          className="min-h-8 shrink-0 rounded border border-border px-1 text-[10px] text-primary hover:bg-muted">Đổi</button>
                      </div>
                      {swapTarget === `${d.day}-${i}` && (
                        <div className="max-h-24 overflow-y-auto rounded border border-border/60 bg-background p-1">
                          {candidates.slice(0, 8).map(f => (
                            <button key={f.name} onClick={() => {
                              setSwapTarget(null);
                              const next = plan.map((day, di) => di === d.day ? swapMeal(day, i, [f]) : day);
                              persistWeek(next);
                            }} className="block w-full truncate rounded px-1 py-1 text-left text-[10px] hover:bg-muted">
                              {f.name} · {f.calories} kcal{f.servingSize ? ` · ${f.servingSize}` : ""}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: restaurants with race-safe filters + incremental loading */}
      {activeTab === "restaurants" && (
        <div className="flex flex-col gap-2" role="tabpanel">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Utensils className="h-4 w-4 text-rose-500"/> Quán ăn TP.HCM</h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={askLocation} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"><Navigation className="h-3.5 w-3.5"/> {geo?"Vị trí đã lấy":"Dùng vị trí"}</button>
              <select value={district} onChange={e=>setDistrict(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"><option value="">Mọi quận</option>{["Quận 1","Quận 3","Quận 5","Quận 7","Quận 11","Tân Phú","Bình Thạnh","Thủ Đức","Gò Vấp","Quận 10"].map(d=><option key={d}>{d}</option>)}</select>
              <select aria-label="Giá từ" value={minPrice} onChange={e=>setMinPrice(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"><option value="">Từ</option><option value="20000">20k</option><option value="50000">50k</option><option value="100000">100k</option><option value="200000">200k</option></select>
              <select aria-label="Giá đến" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"><option value="">Đến</option><option value="30000">30k</option><option value="50000">50k</option><option value="100000">100k</option><option value="200000">200k</option><option value="500000">500k</option></select>
              <select aria-label="Sắp xếp" value={sort} onChange={e=>setSort(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"><option value="rating">Đánh giá: cao → thấp</option><option value="price">Giá: thấp → cao</option><option value="distance" disabled={!geo}>Khoảng cách: gần → xa{geo?"":" (cần vị trí)"}</option></select>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Nguồn: Foody (dữ liệu công khai, scrape 18/11/2026). Không lưu review hay dữ liệu cá nhân.</p>
          <div className="hidden max-h-[calc(100vh-400px)] min-h-[240px] overflow-auto rounded-2xl border border-border/60 bg-card elevated md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="sticky top-0 z-20 border-b border-border/60 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="sticky left-0 top-0 z-30 border-r border-border/60 bg-muted/40 px-4 py-3 font-semibold">Tên quán</th>
                  <th className="px-4 py-3 font-semibold">Quận / Địa chỉ</th>
                  <th className="px-4 py-3 font-semibold">Giá</th>
                  <th className="px-4 py-3 font-semibold">Rating</th>
                  <th className="px-4 py-3 font-semibold">Khoảng cách</th>
                  <th className="px-4 py-3 font-semibold">Link</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map(r=>(
                  <tr key={r.id} className="group border-b border-border/40 last:border-0 hover:bg-muted/30">
                    <td className="sticky left-0 z-10 border-r border-border/60 bg-card px-4 py-3 group-hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        {r.photoUrl && <span className="h-9 w-9 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${r.photoUrl})` }} />}
                        <span className="font-medium text-foreground line-clamp-2">{r.name}</span>
                      </div>
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-xs text-muted-foreground">
                      <div className="font-medium text-foreground/80">{r.district || "—"}</div>
                      <div className="truncate" title={r.address}>{r.address}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{r.priceMin&&r.priceMax?`${fmt(r.priceMin)} – ${fmt(r.priceMax)}`:"Đang cập nhật"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500"/> {r.rating.toFixed(1)}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{r.distanceKm!=null?`${r.distanceKm} km`:"—"}</td>
                    <td className="px-4 py-3"><a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Xem <ExternalLink className="h-3 w-3"/></a></td>
                  </tr>
                ))}
                {restaurants.length===0&&<tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Không tìm thấy quán phù hợp bộ lọc.</td></tr>}
              </tbody>
            </table>
          </div>
          {/* Mobile-first: stacked cards replace the horizontally-scrolling table */}
          <div className="space-y-2 pb-24 md:hidden">
            {restaurants.map(r=>(
              <div key={r.id} className="rounded-2xl border border-border/60 bg-card p-4 elevated space-y-2">
                <div className="flex items-center gap-3">
                  {r.photoUrl && <span className="h-12 w-12 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${r.photoUrl})` }} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground line-clamp-2" title={r.name}>{r.name}</div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500"/> {r.rating.toFixed(1)}</span>
                      <span>{r.priceMin&&r.priceMax?`${fmt(r.priceMin)} – ${fmt(r.priceMax)}`:"Đang cập nhật"}</span>
                      {r.distanceKm!=null&&<span>{r.distanceKm} km</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0"/><span className="line-clamp-2">{r.district ? `${r.district} · ` : ""}{r.address}</span></div>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline">Xem trên Foody <ExternalLink className="h-3.5 w-3.5"/></a>
              </div>
            ))}
            {restaurants.length===0&&<p className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy quán phù hợp bộ lọc.</p>}
          </div>

          {totalPages(total, PAGE_SIZE) > 1 && (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-background/90 py-2 backdrop-blur md:sticky md:bottom-0 md:z-10">
              <span className="text-xs text-muted-foreground">Trang {page} / {totalPages(total, PAGE_SIZE)} · {total} quán</span>
              <div className="flex flex-wrap items-center justify-center gap-1">
                <button onClick={() => loadRestaurants(page - 1)} disabled={page <= 1}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40">Trước</button>
                {pageWindow(page, totalPages(total, PAGE_SIZE), 2).map((token, i) =>
                  token === "…" ? (
                    <span key={`gap-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button key={token} onClick={() => loadRestaurants(token)}
                      aria-current={token === page ? "page" : undefined}
                      className={`min-w-8 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${token === page ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"}`}>
                      {token}
                    </button>
                  )
                )}
                <button onClick={() => loadRestaurants(page + 1)} disabled={page >= totalPages(total, PAGE_SIZE)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-40">Tiếp</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating paging for mobile thumb zone; desktop uses in-flow controls */}
      {activeTab === "restaurants" && showFloat && totalPages(total, PAGE_SIZE) > 1 && (
        <div aria-label="Phân trang" className="fixed bottom-0 left-14 right-0 z-50 border-t border-border/60 bg-background/95 px-4 py-2 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
            <button onClick={() => { loadRestaurants(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={page <= 1}
              className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted disabled:opacity-40">Trước</button>
            <span className="text-sm font-medium text-muted-foreground">Trang {page} / {totalPages(total, PAGE_SIZE)}</span>
            <button onClick={() => { loadRestaurants(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={page >= totalPages(total, PAGE_SIZE)}
              className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted disabled:opacity-40">Tiếp</button>
          </div>
        </div>
      )}
    </div>
  );
}
