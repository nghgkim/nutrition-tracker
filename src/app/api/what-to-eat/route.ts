import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { suggestDishes, type Dish } from "@/lib/what-to-eat";
import { matchRestaurantsForDish } from "@/lib/dish-match";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);
  const [goalRow, logs, foods, candidates] = await Promise.all([
    prisma.goal.findUnique({ where: { userId: user.id } }),
    prisma.foodLog.findMany({ where: { userId: user.id, date: new Date(today) }, include: { food: true } }),
    prisma.food.findMany({ where: { userId: null, source: { in: ["NIN2026-dish", "NIN2026"] }, calories: { gt: 0, lt: 1200 } }, take: 600 }),
    // Matching stays on the server: the browser never downloads the full venue table.
    prisma.restaurant.findMany({
      select: { name: true, url: true, rating: true, cuisines: true },
      orderBy: { rating: "desc" },
      take: 5000,
    }),
  ]);
  const goal = goalRow?.dailyCalories || 2000;
  const eaten = logs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
  const remaining = Math.max(0, goal - eaten);
  const suggestions = suggestDishes(remaining, foods as Dish[]).map(s => {
    const place = matchRestaurantsForDish(s.dish.name, candidates, 1)[0];
    return { ...s, place: place ? { name: place.name, url: place.url } : null };
  });
  return NextResponse.json({ goal, eaten, remaining, suggestions });
}
