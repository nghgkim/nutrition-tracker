import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { buildMealPlan } from "@/lib/guidance";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const goal = await prisma.goal.findUnique({ where: { userId: user.id } });
  const target = goal?.dailyCalories || 2000;
  return NextResponse.json({ target, meals: buildMealPlan(target) });
}
