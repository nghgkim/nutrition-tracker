import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { normalizeMealType, parseDay, parsePositiveNumber, localDayKey } from "@/lib/request-validation";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const date = new URL(req.url).searchParams.get("date");
  const where: { userId: string; date?: Date } = { userId: user.id };
  if (date) {
    const day = parseDay(date);
    if (!day) return NextResponse.json(problemResponse("Invalid date", 400), { status: 400 });
    where.date = day;
  }
  const logs = await prisma.foodLog.findMany({
    where,
    include: { food: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const body = await req.json();
  const foodId = typeof body.foodId === "string" ? body.foodId.trim() : "";
  if (!foodId) return NextResponse.json(problemResponse("foodId required", 400), { status: 400 });

  const quantity = parsePositiveNumber(body.quantity ?? 1, { min: 0.001, max: 100_000 });
  if (quantity === null) {
    return NextResponse.json(problemResponse("quantity must be a positive finite number", 400), { status: 400 });
  }

  let mealType: string | null = null;
  if (body.mealType !== undefined && body.mealType !== null && body.mealType !== "") {
    const normalized = normalizeMealType(body.mealType);
    if (!normalized) return NextResponse.json(problemResponse("invalid mealType", 400), { status: 400 });
    mealType = normalized;
  }

  const day = body.date === undefined || body.date === null || body.date === ""
    ? parseDay(localDayKey(new Date()))
    : parseDay(body.date);
  if (!day) return NextResponse.json(problemResponse("Invalid date", 400), { status: 400 });

  const log = await prisma.foodLog.create({
    data: { userId: user.id, foodId, quantity, mealType, date: day },
    include: { food: true },
  });
  return NextResponse.json({ log }, { status: 201 });
}
