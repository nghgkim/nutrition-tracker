import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { normalizeGoalMode } from "@/lib/goal-mode";
import { parsePositiveNumber } from "@/lib/request-validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const goal = await prisma.goal.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, dailyCalories: 2000 },
  });
  return NextResponse.json({ goal: { ...goal, mode: normalizeGoalMode(goal.mode) } });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const body = await req.json();
  const { dailyCalories, mode } = body;
  // Legacy clients send only calories -> leave the stored mode untouched.
  const data: { dailyCalories?: number; mode?: string } = {};
  const parsed = dailyCalories === undefined ? null : parsePositiveNumber(dailyCalories, { min: 1, max: 100_000 });
  if (dailyCalories !== undefined && parsed === null) return NextResponse.json(problemResponse("invalid dailyCalories", 400), { status: 400 });
  if (parsed !== null) data.dailyCalories = parsed;
  if (mode !== undefined) data.mode = normalizeGoalMode(mode);
  const goal = await prisma.goal.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, dailyCalories: parsed ?? 2000, mode: normalizeGoalMode(mode) },
  });
  return NextResponse.json({ goal: { ...goal, mode: normalizeGoalMode(goal.mode) } });
}
