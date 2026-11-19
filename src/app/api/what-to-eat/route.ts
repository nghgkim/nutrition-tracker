import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);
  const [goalRow, logs] = await Promise.all([
    prisma.goal.findUnique({ where: { userId: user.id } }),
    prisma.foodLog.findMany({ where: { userId: user.id, date: new Date(today) }, include: { food: true } }),
  ]);
  const goal = goalRow?.dailyCalories || 2000;
  const eaten = logs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
  const remaining = Math.max(0, goal - eaten);
  return NextResponse.json({ goal, eaten, remaining });
}
