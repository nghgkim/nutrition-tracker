import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { removeDiacritics } from "@/lib/normalize";

interface CrawlerItem {
  name: string;
  restaurant_name: string | null;
  source: string;
  source_id: string;
  price: number | null;
  image_url: string | null;
  external_url: string | null;
}

interface NutritionSuggestion {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string | null;
}

interface Candidate extends CrawlerItem {
  suggestion: NutritionSuggestion | null;
}

function normalize(value: string): string {
  return removeDiacritics(value).toLowerCase().trim();
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });

  const base = (process.env.FOOD_CRAWLER_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  const query = normalize(new URL(req.url).searchParams.get("q")?.trim() || "");

  try {
    const response = await fetch(`${base}/export/nutrition-tracker?limit=200`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`crawler returned ${response.status}`);
    const payload = (await response.json()) as { items?: CrawlerItem[] };
    const items = Array.isArray(payload.items) ? payload.items : [];

    const localFoods = await prisma.food.findMany({
      where: { userId: null },
      select: { name: true, calories: true, protein: true, carbs: true, fat: true, servingSize: true },
    });
    const byName = new Map<string, NutritionSuggestion>();
    for (const food of localFoods) {
      const key = normalize(food.name);
      if (!byName.has(key)) {
        byName.set(key, {
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          servingSize: food.servingSize,
        });
      }
    }

    const candidates: Candidate[] = items
      .filter((item) => Boolean(item?.name))
      .map((item) => ({
        ...item,
        suggestion: byName.get(normalize(item.name)) ?? null,
      }))
      .filter((item) => !query || normalize(item.name).includes(query));

    return NextResponse.json({ candidates: candidates.slice(0, 50), crawlerUrl: base });
  } catch {
    return NextResponse.json(
      { error: "Food crawler is unavailable", candidates: [] },
      { status: 502 },
    );
  }
}
