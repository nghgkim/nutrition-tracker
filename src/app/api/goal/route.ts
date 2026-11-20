import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const goal = await prisma.goal.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, dailyCalories: 2000 },
  });
  return NextResponse.json({ goal });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { dailyCalories } = await req.json();
  const goal = await prisma.goal.upsert({
    where: { userId: user.id },
    update: { dailyCalories: Number(dailyCalories) },
    create: { userId: user.id, dailyCalories: Number(dailyCalories) },
  });
  return NextResponse.json({ goal });
}
