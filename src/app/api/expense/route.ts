import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
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
  const { category, amount, date, note } = await req.json();
  if (!category || amount === undefined || Number(amount) <= 0) return NextResponse.json({ error: "category and positive amount required" }, { status: 400 });
  const log = await prisma.expense.create({
    data: { userId: user.id, category, amount: Number(amount), date: new Date(date || new Date().toISOString().slice(0, 10)), note: note ?? null },
  });
  return NextResponse.json({ log }, { status: 201 });
}
