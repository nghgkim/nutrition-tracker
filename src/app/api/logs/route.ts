import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const where: { userId: string; date?: Date } = { userId: user.id };
  if (date) where.date = new Date(date);
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
  const { foodId, quantity, mealType, date } = body;
  if (!foodId) return NextResponse.json(problemResponse("foodId required", 400), { status: 400 });
  const log = await prisma.foodLog.create({
    data: {
      userId: user.id,
      foodId,
      quantity: Number(quantity ?? 1),
      mealType: mealType ?? null,
      date: date ? new Date(date) : new Date(),
    },
    include: { food: true },
  });
  return NextResponse.json({ log }, { status: 201 });
}
