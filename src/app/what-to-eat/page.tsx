"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils, Star, MapPin, ExternalLink, Navigation, SlidersHorizontal, X } from "lucide-react";
import { createGenerationGuard } from "@/lib/request-guard";
import { pageWindow, totalPages } from "@/lib/pagination";
import { countActiveFilterValues } from "@/lib/filter-badge";

interface Restaurant { id: string; name: string; address: string; rating: number; photoUrl: string | null; url: string; distanceKm?: number|null; priceMin?: number|null; priceMax?: number|null; district?: string|null; openHours?: string|null; cuisines?: string|null; }
interface WteData { goal: number; eaten: number; remaining: number; }

const PAGE_SIZE = 9;
const fmt = (n:number)=>new Intl.NumberFormat("vi-VN").format(n)+"₫";

export default function WhatToEatPage() {
  const router = useRouter();
  const [data, setData] = useState<WteData | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [geo, setGeo] = useState<{lat:number;lon:number}|null>(null);
  const [districts, setDistricts] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("rating");
  const [minRating, setMinRating] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFloat, setShowFloat] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const filterWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!panelOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (filterWrapRef.current && !filterWrapRef.current.contains(e.target as Node)) setPanelOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPanelOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [panelOpen]);

  // Discard out-of-order filter responses and cancel their network requests.
  const guard = useRef(createGenerationGuard());
  const abortRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<Restaurant[]>([]);
  const latestKeyRef = useRef("");
  useEffect(() => () => abortRef.current?.abort(), []);

  // Floating paging appears after real scrolling, with hysteresis to avoid flicker.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowFloat(prev => (prev ? y > 300 : y > 400));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    districts.forEach(d => p.append("district", d));
    if (minPrice) p.set("minPrice",minPrice);
    if (maxPrice) p.set("maxPrice",maxPrice);
    if (sort !== "rating") p.set("sort",sort);
    if (minRating) p.set("minRating",minRating);
    if (maxDistance && geo) p.set("maxDistance",maxDistance);
    const requestKey = p.toString();
    latestKeyRef.current = requestKey;
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
  }, [geo, districts, minPrice, maxPrice, sort, minRating, maxDistance]);

  useEffect(() => {
    Promise.all([
      loadWte(),
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

  const activeFilters = countActiveFilterValues({ districts, minPrice, maxPrice, minRating, maxDistance, sort });
  function resetFilters() {
    setDistricts([]); setMinPrice(""); setMaxPrice(""); setSort("rating"); setMinRating(""); setMaxDistance("");
  }

  if (loading || !data) return <div className="max-w-5xl mx-auto px-4 py-6"><div className="h-96 skeleton rounded-2xl" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gợi ý</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hôm nay ăn gì?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dựa trên calo còn lại: <span className="font-semibold text-primary">{Math.round(data.remaining)} kcal</span> (đã ăn {Math.round(data.eaten)} / {data.goal})</p>
      </div>

      {/* Tab 2: restaurants with race-safe filters + incremental loading */}
      <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold flex items-center gap-2"><Utensils className="h-4 w-4 text-rose-500"/> Quán ăn TP.HCM</h2>
            <div ref={filterWrapRef} className="relative flex gap-2 flex-wrap">
              <button onClick={askLocation} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-xs hover:bg-muted"><Navigation className="h-3.5 w-3.5"/> {geo?"Vị trí đã lấy":"Dùng vị trí"}</button>
              <button onClick={() => setPanelOpen(!panelOpen)} aria-expanded={panelOpen}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground">
                <SlidersHorizontal className="h-3.5 w-3.5"/> Bộ lọc{activeFilters > 0 ? ` (${activeFilters})` : ""}
              </button>
              {panelOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 max-h-[calc(100vh-120px)] w-[min(92vw,420px)] overflow-y-auto rounded-2xl border border-border/60 bg-card p-4 shadow-xl elevated space-y-3" role="region" aria-label="Bộ lọc quán ăn">
              <div className="sticky top-0 z-10 -mt-1 flex items-center justify-between bg-card py-1">
                <span className="text-sm font-semibold">Bộ lọc{activeFilters > 0 ? ` · ${activeFilters} đang áp dụng` : ""}</span>
                <div className="flex items-center gap-2">
                  <button onClick={resetFilters} className="text-xs text-primary hover:underline">Xóa tất cả</button>
                  <button onClick={() => setPanelOpen(false)} aria-label="Đóng bộ lọc" className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="col-span-2 flex flex-col gap-1 text-[11px] text-muted-foreground sm:col-span-3">
                  <div className="flex items-center justify-between">
                    <span>Quận {districts.length > 0 && `(${districts.length} đã chọn)`}</span>
                    <button onClick={() => setDistricts([])} className="text-primary hover:underline">Tất cả</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["Quận 1","Quận 3","Quận 5","Quận 7","Quận 11","Tân Phú","Bình Thạnh","Thủ Đức","Gò Vấp","Quận 10"].map(d => (
                      <button key={d} onClick={() => setDistricts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                        aria-pressed={districts.includes(d)}
                        className={`min-h-11 rounded-lg border px-2 text-xs transition-colors ${districts.includes(d) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Giá từ
                  <select aria-label="Giá từ" value={minPrice} onChange={e=>setMinPrice(e.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-2 text-xs text-foreground"><option value="">Từ</option><option value="20000">20k</option><option value="50000">50k</option><option value="100000">100k</option><option value="200000">200k</option></select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Giá đến
                  <select aria-label="Giá đến" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-2 text-xs text-foreground"><option value="">Đến</option><option value="30000">30k</option><option value="50000">50k</option><option value="100000">100k</option><option value="200000">200k</option><option value="500000">500k</option></select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Rating tối thiểu
                  <select aria-label="Rating tối thiểu" value={minRating} onChange={e=>setMinRating(e.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-2 text-xs text-foreground"><option value="">Mọi rating</option><option value="6">6+</option><option value="7">7+</option><option value="8">8+</option><option value="9">9+</option></select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Khoảng cách
                  <select aria-label="Khoảng cách tối đa" value={maxDistance} onChange={e=>setMaxDistance(e.target.value)} disabled={!geo} className="min-h-11 rounded-lg border border-border bg-background px-2 text-xs text-foreground disabled:opacity-50"><option value="">{geo?"Mọi khoảng cách":"Cần vị trí"}</option><option value="1">1 km</option><option value="3">3 km</option><option value="5">5 km</option><option value="10">10 km</option></select>
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Sắp xếp
                  <select aria-label="Sắp xếp" value={sort} onChange={e=>setSort(e.target.value)} className="min-h-11 rounded-lg border border-border bg-background px-2 text-xs text-foreground"><option value="rating">Đánh giá: cao → thấp</option><option value="price">Giá: thấp → cao</option><option value="distance" disabled={!geo}>Khoảng cách: gần → xa</option></select>
                </label>
              </div>
            </div>
          )}
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

      {/* Floating paging for mobile thumb zone; desktop uses in-flow controls */}
      {showFloat && totalPages(total, PAGE_SIZE) > 1 && (
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
