import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { checkBudgetAlert } from "@/lib/budget-alert";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [logs, budget] = await Promise.all([
    prisma.expense.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
    prisma.budget.findUnique({ where: { userId: user.id } }),
  ]);
  const now = new Date();
  const monthLogs = logs.filter(l => { const d = new Date(l.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const total = monthLogs.reduce((s, l) => s + l.amount, 0);
  return NextResponse.json({ logs, total, budget: budget?.amount ?? 2000000 });
}
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { category, amount, date, note, fundSource } = await req.json();
  if (!category || amount === undefined || Number(amount) <= 0) return NextResponse.json({ error: "category and positive amount required" }, { status: 400 });
  const source = fundSource === "household" ? "household" : "personal";

  // household expenses require family membership
  let membership = null;
  if (source === "household") {
    membership = await prisma.familyMember.findFirst({ where: { userId: user.id } });
    if (!membership) return NextResponse.json({ error: "Must be in a family to use household fund" }, { status: 400 });
  }

  const d = date ? new Date(date) : new Date();
  const log = await prisma.expense.create({
    data: { userId: user.id, category, amount: Number(amount), fundSource: source, date: d, note: note ?? null },
  });

  // Recalculate and alert
  const month = d.toISOString().slice(0, 7);
  const start = new Date(d.getFullYear(), d.getMonth(), 1); const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  let alert = null;
  if (source === "personal") {
    const u = await prisma.user.findUnique({ where: { id: user.id }, select: { personalBudget: true } });
    const spent = (await prisma.expense.aggregate({ where: { userId: user.id, fundSource: "personal", date: { gte: start, lt: end } }, _sum: { amount: true } }))._sum.amount || 0;
    alert = await checkBudgetAlert(`personal:${user.id}`, month, spent, u?.personalBudget ?? 2000000, user.id);
  } else if (membership) {
    const spent = (await prisma.expense.aggregate({ where: { fundSource: "household", date: { gte: start, lt: end }, user: { familyMembers: { some: { familyId: membership.familyId } } } }, _sum: { amount: true } }))._sum.amount || 0;
    const fam = await prisma.family.findUnique({ where: { id: membership.familyId } });
    alert = await checkBudgetAlert(`household:${membership.familyId}`, month, spent, fam?.householdBudget ?? 10000000, user.id);
  }

  return NextResponse.json({ log, alert }, { status: 201 });
}
