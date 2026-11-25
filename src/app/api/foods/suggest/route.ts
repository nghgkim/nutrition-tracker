import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rankFoodMatches } from "@/lib/food-suggest";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ foods: [] });
  const foods = await prisma.food.findMany({
    where: { userId: null },
    select: { id: true, name: true, calories: true, protein: true, carbs: true, fat: true, servingSize: true, source: true },
  });
  return NextResponse.json({ foods: rankFoodMatches(foods, q, 8) });
}
