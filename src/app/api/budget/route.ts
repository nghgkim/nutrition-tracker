import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { amount } = await req.json();
  if (amount === undefined || Number(amount) < 0) return NextResponse.json({ error: "valid amount required" }, { status: 400 });
  const budget = await prisma.budget.upsert({ where: { userId: user.id }, update: { amount: Number(amount) }, create: { userId: user.id, amount: Number(amount) } });
  return NextResponse.json({ budget: budget.amount });
}
