import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { suggestDishes, type Dish } from "@/lib/what-to-eat";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);
  const [goalRow, logs, foods, restaurants] = await Promise.all([
    prisma.goal.findUnique({ where: { userId: user.id } }),
    prisma.foodLog.findMany({ where: { userId: user.id, date: new Date(today) }, include: { food: true } }),
    prisma.food.findMany({ where: { userId: null, source: { in: ["NIN2026-dish", "NIN2026"] }, calories: { gt: 0, lt: 1200 } }, take: 600 }),
    prisma.restaurant.findMany({ orderBy: { rating: "desc" }, take: 6 }),
  ]);
  const goal = goalRow?.dailyCalories || 2000;
  const eaten = logs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
  const remaining = Math.max(0, goal - eaten);
  const suggestions = suggestDishes(remaining, foods as Dish[]);
  return NextResponse.json({ goal, eaten, remaining, suggestions, restaurants });
}
