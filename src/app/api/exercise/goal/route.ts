import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const g = await prisma.exerciseGoal.findUnique({ where: { userId: user.id } });
  return NextResponse.json({ calories: g?.calories ?? 300 });
}
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { calories } = await req.json();
  if (calories === undefined || Number(calories) < 0) return NextResponse.json(problemResponse("valid calories required", 400), { status: 400 });
  const g = await prisma.exerciseGoal.upsert({ where: { userId: user.id }, update: { calories: Number(calories) }, create: { userId: user.id, calories: Number(calories) } });
  return NextResponse.json({ calories: g.calories });
}
