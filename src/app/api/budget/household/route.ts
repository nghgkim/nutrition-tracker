import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { parsePositiveNumber } from "@/lib/request-validation";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const m = await prisma.familyMember.findFirst({ where: { userId: user.id }, include: { family: true } });
  if (!m) return NextResponse.json(problemResponse("Not in a family", 403), { status: 403 });
  return NextResponse.json({ budget: m.family.householdBudget, role: m.role });
}
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const m = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!m || m.role !== "owner") return NextResponse.json(problemResponse("Only owner can set household budget", 403), { status: 403 });
  const { amount } = await req.json();
  const parsed = parsePositiveNumber(amount, { min: 0, max: 1_000_000_000 });
  if (parsed === null) return NextResponse.json(problemResponse("valid amount required", 400), { status: 400 });
  const f = await prisma.family.update({ where: { id: m.familyId }, data: { householdBudget: parsed } });
  return NextResponse.json({ budget: f.householdBudget });
}
