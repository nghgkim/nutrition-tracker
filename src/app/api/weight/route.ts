import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { localDayKey, parseDay, parsePositiveNumber } from "@/lib/request-validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const logs = await prisma.weightLog.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { weight, date, note } = await req.json();
  const kg = parsePositiveNumber(weight, { min: 1, max: 1000 });
  if (kg === null) return NextResponse.json(problemResponse("weight must be a positive finite number", 400), { status: 400 });
  const day = date ? parseDay(date) : parseDay(localDayKey(new Date()));
  if (!day) return NextResponse.json(problemResponse("Invalid date", 400), { status: 400 });
  const log = await prisma.weightLog.upsert({
    where: { userId_date: { userId: user.id, date: day } },
    update: { weight: kg, note: note ?? null },
    create: { userId: user.id, weight: kg, date: day, note: note ?? null },
  });
  return NextResponse.json({ log }, { status: 201 });
}
