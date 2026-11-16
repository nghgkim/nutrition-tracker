import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const month = new URL(req.url).searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1); const end = new Date(y, m, 1);

  const myLogs = await prisma.expense.findMany({ where: { userId: user.id, date: { gte: start, lt: end } } });
  const membership = await prisma.familyMember.findFirst({ where: { userId: user.id }, include: { family: true } });
  const famLogs = membership
    ? await prisma.expense.findMany({ where: { date: { gte: start, lt: end }, fundSource: "household", user: { familyMembers: { some: { familyId: membership.familyId } } } } })
    : [];

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { personalBudget: true } });
  const personalSpent = myLogs.filter(l => l.fundSource === "personal").reduce((s, l) => s + l.amount, 0);
  const householdSpent = famLogs.reduce((s, l) => s + l.amount, 0);
  const personalBudget = me?.personalBudget ?? 2000000;
  const householdBudget = membership?.family.householdBudget ?? 0;

  const catMap: Record<string, number> = {};
  for (const l of [...myLogs, ...famLogs]) catMap[l.category] = (catMap[l.category] || 0) + l.amount;
  const categories = Object.entries(catMap).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);

  const historyMap: Record<string, number> = {};
  for (const l of [...myLogs, ...famLogs]) { const k = l.date.toISOString().slice(0, 10); historyMap[k] = (historyMap[k] || 0) + l.amount; }
  const history = Object.entries(historyMap).map(([date, amount]) => ({ date, amount })).sort();

  return NextResponse.json({
    month, personal: { budget: personalBudget, spent: personalSpent },
    household: { budget: householdBudget, spent: householdSpent, isOwner: membership?.role === "owner", hasFamily: !!membership },
    categories, history,
  });
}
