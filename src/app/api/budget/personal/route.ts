import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { personalBudget: true } });
  return NextResponse.json({ budget: u?.personalBudget ?? 2000000 });
}
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { amount } = await req.json();
  if (amount === undefined || Number(amount) < 0) return NextResponse.json({ error: "valid amount required" }, { status: 400 });
  const u = await prisma.user.update({ where: { id: user.id }, data: { personalBudget: Number(amount) }, select: { personalBudget: true } });
  return NextResponse.json({ budget: u.personalBudget });
}
