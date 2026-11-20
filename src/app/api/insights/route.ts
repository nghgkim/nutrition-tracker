import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildProgress } from "@/lib/progress";
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const range = new URL(req.url).searchParams.get("range") || "week";
  const days = range === "month" ? 30 : 7;
  const since = new Date(); since.setDate(since.getDate() - days);
  const [foodLogs, exercises, goal] = await Promise.all([
    prisma.foodLog.findMany({ where: { userId: user.id, date: { gte: since } }, include: { food: true } }),
    prisma.exerciseLog.findMany({ where: { userId: user.id, date: { gte: since } } }),
    prisma.goal.findUnique({ where: { userId: user.id } }),
  ]);
  const result = buildProgress(
    foodLogs.map(l => ({ date: l.date.toISOString().slice(0,10), calories: l.food.calories * l.quantity })),
    exercises.map(l => ({ date: l.date.toISOString().slice(0,10), calories: l.calories })),
    days
  );
  return NextResponse.json({ ...result, goal: goal?.dailyCalories || 2000, range });
}
