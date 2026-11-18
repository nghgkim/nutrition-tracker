import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildWeeklyPlan } from "@/lib/meal-plan";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [plan, foods, goal] = await Promise.all([
    prisma.mealPlan.findUnique({ where: { userId: user.id } }),
    prisma.food.findMany({ where: { userId: null, source: { in: ["NIN2026","NIN2026-dish"] } }, take: 600 }),
    prisma.goal.findUnique({ where: { userId: user.id } }),
  ]);
  const target = goal?.dailyCalories || 2000;
  const week = plan?.week ?? buildWeeklyPlan(foods as never, target);
  return NextResponse.json({ week, target });
}
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { week } = await req.json();
  if (!Array.isArray(week)) return NextResponse.json({ error: "week required" }, { status: 400 });
  const plan = await prisma.mealPlan.upsert({ where: { userId: user.id }, update: { week }, create: { userId: user.id, week } });
  return NextResponse.json({ week: plan.week });
}
