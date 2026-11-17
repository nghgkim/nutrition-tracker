"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Utensils, RefreshCw, Star, MapPin, ExternalLink, AlertCircle, ChefHat } from "lucide-react";

interface Dish { name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string | null; source: string; }
interface Suggestion { dish: Dish; reason: string; }
interface Restaurant { id: string; name: string; address: string; rating: number; photoUrl: string | null; url: string; }
interface Data { goal: number; eaten: number; remaining: number; suggestions: Suggestion[]; restaurants: Restaurant[]; }

export default function WhatToEatPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/what-to-eat");
    if (res.status === 401) { router.push("/login"); return; }
    setData(await res.json());
    setLoading(false);
  }, [router]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-6"><div className="h-96 skeleton rounded-2xl" /></div>;
  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Gợi ý</p>
        <h1 className="text-2xl font-semibold tracking-tight">Hôm nay ăn gì?</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dựa trên calo còn lại: <span className="font-semibold text-primary">{Math.round(data.remaining)} kcal</span> (đã ăn {Math.round(data.eaten)} / {data.goal})</p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2"><ChefHat className="h-4 w-4 text-primary" /> Món gợi ý từ NIN 2026</h2>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors">
            <RefreshCw className="h-4 w-4" /> Gợi ý lại
          </button>
        </div>
        {data.suggestions.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500" />
            <p className="mt-3 text-sm font-medium">Bạn đã vượt mục tiêu calo hôm nay</p>
            <p className="mt-1 text-xs text-muted-foreground">Hãy chọn món nhẹ hoặc điều chỉnh mục tiêu trong Hồ sơ.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.suggestions.map((s, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-2">
                <div className="text-sm font-medium text-foreground">{s.dish.name}</div>
                <div className="text-lg font-bold text-primary">{s.dish.calories} <span className="text-sm font-normal text-muted-foreground">kcal</span></div>
                <div className="text-xs text-muted-foreground">{s.reason}</div>
                <div className="text-[10px] text-muted-foreground">P {s.dish.protein}g · C {s.dish.carbs}g · F {s.dish.fat}g</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2"><Utensils className="h-4 w-4 text-rose-500" /> Quán ăn gợi ý ở TP.HCM</h2>
        <p className="text-[10px] text-muted-foreground">Nguồn: Dữ liệu công khai từ Foody ( scrape 17/11/2026 ). Chỉ tên/địa chỉ/điểm — không lưu review hay dữ liệu cá nhân.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.restaurants.map(r => (
            <div key={r.id} className="rounded-2xl border border-border/60 bg-card elevated overflow-hidden">
              {r.photoUrl && <img src={r.photoUrl} alt={r.name} className="h-32 w-full object-cover" loading="lazy" />}
              <div className="p-4 space-y-2">
                <div className="text-sm font-semibold text-foreground line-clamp-2">{r.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="h-3.5 w-3.5 text-amber-500" /> {r.rating.toFixed(1)}</div>
                <div className="flex items-start gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> <span className="line-clamp-2">{r.address}</span></div>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Xem trên Foody <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
