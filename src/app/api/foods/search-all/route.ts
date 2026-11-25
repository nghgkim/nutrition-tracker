import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rankFoodMatches, type SuggestFood } from "@/lib/food-suggest";
import { normalizeInternetFoods, type RawInternetFood } from "@/lib/food-search-all";
import { resilientFetchJson, CircuitOpenError } from "@/lib/resilient-fetch";

interface OffProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    "energy-kcal_100g"?: number;
    protein_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ groups: [] });

  // Local NIN2026 first — always fast and trusted.
  const local = await prisma.food.findMany({
    where: { userId: null },
    select: { id: true, name: true, calories: true, protein: true, carbs: true, fat: true, servingSize: true, source: true },
  });
  type ResultItem = SuggestFood | ReturnType<typeof normalizeInternetFoods>[number];
  const groups: { source: string; items: ResultItem[] }[] = [{
    source: "NIN2026",
    items: rankFoodMatches(local as SuggestFood[], q, 5).map(f => ({ ...f, source: f.source || "NIN2026" })),
  }];

  const degraded: string[] = [];
  try {
    // Note: OFF's `fields` param currently returns 503; omit it and map the
    // full product object. page_size stays small to bound payload size.
    const params = new URLSearchParams({ search_terms: q, json: "1", page_size: "5" });
    const data = await resilientFetchJson<{ products?: OffProduct[] }>(
      "openfoodfacts", `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`
    );
    const raw: RawInternetFood[] = (data.products || []).map(p => ({
      name: p.product_name || "",
      brand: p.brands || null,
      calories: p.nutriments?.["energy-kcal_100g"] ?? null,
      protein: p.nutriments?.protein_100g ?? null,
      carbs: p.nutriments?.carbohydrates_100g ?? null,
      fat: p.nutriments?.fat_100g ?? null,
    }));
    groups.push({ source: "Open Food Facts", items: normalizeInternetFoods(raw, "Open Food Facts") });
  } catch (err) {
    degraded.push(err instanceof CircuitOpenError
      ? "Open Food Facts tạm thời không khả dụng (mạch ngắt)"
      : "Open Food Facts tạm thời không khả dụng");
  }

  const key = process.env.FOOD_FDC_API_KEY;
  if (key) {
    try {
      const params = new URLSearchParams({ query: q, pageSize: "5", dataType: "Foundation,SR Legacy", api_key: key });
      const data = await resilientFetchJson<{ foods?: { fdcId: number; description: string; foodNutrients?: { nutrientId: number; value: number }[] }[] }>(
        "usda-fdc", `https://api.nal.usda.gov/fdc/v1/foods/search?${params.toString()}`
      );
      const nutrient = (list: { nutrientId: number; value: number }[] | undefined, id: number) =>
        list?.find(n => n.nutrientId === id)?.value ?? null;
      const raw: RawInternetFood[] = (data.foods || []).map(f => ({
        name: f.description, brand: null,
        calories: nutrient(f.foodNutrients, 1008), protein: nutrient(f.foodNutrients, 1003),
        carbs: nutrient(f.foodNutrients, 1005), fat: nutrient(f.foodNutrients, 1004),
      }));
      groups.push({ source: "USDA-FDC", items: normalizeInternetFoods(raw, "USDA-FDC") });
    } catch { degraded.push("USDA tạm thời không khả dụng"); }
  }

  return NextResponse.json({ groups, degraded });
}
