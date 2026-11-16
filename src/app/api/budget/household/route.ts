import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = await prisma.familyMember.findFirst({ where: { userId: user.id }, include: { family: true } });
  if (!m) return NextResponse.json({ error: "Not in a family" }, { status: 403 });
  return NextResponse.json({ budget: m.family.householdBudget, role: m.role });
}
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!m || m.role !== "owner") return NextResponse.json({ error: "Only owner can set household budget" }, { status: 403 });
  const { amount } = await req.json();
  if (amount === undefined || Number(amount) < 0) return NextResponse.json({ error: "valid amount required" }, { status: 400 });
  const f = await prisma.family.update({ where: { id: m.familyId }, data: { householdBudget: Number(amount) } });
  return NextResponse.json({ budget: f.householdBudget });
}
