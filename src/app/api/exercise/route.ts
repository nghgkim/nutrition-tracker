import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { localDayKey, parseDay, parsePositiveNumber } from "@/lib/request-validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const logs = await prisma.exerciseLog.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } });
  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { type, duration, calories, date } = await req.json();
  const cleanType = typeof type === "string" ? type.trim() : "";
  if (!cleanType) return NextResponse.json(problemResponse("type required", 400), { status: 400 });

  const minutes = parsePositiveNumber(duration, { min: 0.001, max: 1440 });
  const burned = parsePositiveNumber(calories, { min: 0, max: 100_000 });
  if (minutes === null || burned === null) {
    return NextResponse.json(problemResponse("duration and calories must be finite numbers in range", 400), { status: 400 });
  }

  const day = date === undefined || date === null || date === ""
    ? parseDay(localDayKey(new Date()))
    : parseDay(date);
  if (!day) return NextResponse.json(problemResponse("Invalid date", 400), { status: 400 });

  const log = await prisma.exerciseLog.create({
    data: { userId: user.id, type: cleanType, duration: minutes, calories: burned, date: day },
  });
  return NextResponse.json({ log }, { status: 201 });
}
