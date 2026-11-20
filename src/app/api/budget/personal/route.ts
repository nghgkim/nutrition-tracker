import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { personalBudget: true } });
  return NextResponse.json({ budget: u?.personalBudget ?? 2000000 });
}
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { amount } = await req.json();
  if (amount === undefined || Number(amount) < 0) return NextResponse.json(problemResponse("valid amount required", 400), { status: 400 });
  const u = await prisma.user.update({ where: { id: user.id }, data: { personalBudget: Number(amount) }, select: { personalBudget: true } });
  return NextResponse.json({ budget: u.personalBudget });
}
