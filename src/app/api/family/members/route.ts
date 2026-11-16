import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const myMembership = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!myMembership) return NextResponse.json({ error: "Not in a family" }, { status: 403 });
  const members = await prisma.familyMember.findMany({
    where: { familyId: myMembership.familyId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const today = new Date().toISOString().slice(0, 10);
  const totals = await Promise.all(members.map(async (m) => {
    const logs = await prisma.foodLog.findMany({
      where: { userId: m.userId, date: new Date(today) },
      include: { food: true },
    });
    const calories = logs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
    return { userId: m.userId, name: m.user.name, email: m.user.email, role: m.role, caloriesToday: Math.round(calories) };
  }));
  return NextResponse.json({ members: totals });
}
