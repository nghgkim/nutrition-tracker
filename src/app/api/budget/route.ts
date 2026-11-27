import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { parsePositiveNumber } from "@/lib/request-validation";
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { amount } = await req.json();
  const parsed = parsePositiveNumber(amount, { min: 0, max: 1_000_000_000 });
  if (parsed === null) return NextResponse.json(problemResponse("valid amount required", 400), { status: 400 });
  const budget = await prisma.budget.upsert({ where: { userId: user.id }, update: { amount: parsed }, create: { userId: user.id, amount: parsed } });
  return NextResponse.json({ budget: budget.amount });
}
