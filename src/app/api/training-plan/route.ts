import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const plan = await prisma.trainingPlan.findUnique({ where: { userId: user.id } });
  const week = plan?.week ?? Array.from({ length: 7 }, (_, i) => ({ day: i, done: false }));
  return NextResponse.json({ week });
}
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { week } = await req.json();
  if (!Array.isArray(week)) return NextResponse.json(problemResponse("week array required", 400), { status: 400 });
  const plan = await prisma.trainingPlan.upsert({ where: { userId: user.id }, update: { week }, create: { userId: user.id, week } });
  return NextResponse.json({ week: plan.week });
}
