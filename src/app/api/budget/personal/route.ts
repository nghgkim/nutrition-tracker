import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { parsePositiveNumber } from "@/lib/request-validation";
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
  const parsed = parsePositiveNumber(amount, { min: 0, max: 1_000_000_000 });
  if (parsed === null) return NextResponse.json(problemResponse("valid amount required", 400), { status: 400 });
  const u = await prisma.user.update({ where: { id: user.id }, data: { personalBudget: parsed }, select: { personalBudget: true } });
  return NextResponse.json({ budget: u.personalBudget });
}
