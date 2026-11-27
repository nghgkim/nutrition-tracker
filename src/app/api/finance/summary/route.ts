import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { summarizeExpenses, type ExpenseLike } from "@/lib/finance-summary";
import { monthBounds } from "@/lib/request-validation";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const month = new URL(req.url).searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const bounds = monthBounds(month);
  if (!bounds) return NextResponse.json(problemResponse("Invalid month", 400), { status: 400 });

  const myLogs = await prisma.expense.findMany({
    where: { userId: user.id, date: { gte: bounds.start, lt: bounds.end } },
  });
  const membership = await prisma.familyMember.findFirst({ where: { userId: user.id }, include: { family: true } });
  const famLogs = membership
    ? await prisma.expense.findMany({
        where: {
          date: { gte: bounds.start, lt: bounds.end },
          fundSource: "household",
          user: { familyMembers: { some: { familyId: membership.familyId } } },
        },
      })
    : [];

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { personalBudget: true } });
  const result = summarizeExpenses(myLogs as ExpenseLike[], famLogs as ExpenseLike[], {
    personalBudget: me?.personalBudget ?? 2_000_000,
    householdBudget: membership?.family.householdBudget ?? 0,
    isOwner: membership?.role === "owner",
    hasFamily: !!membership,
    month,
  });
  return NextResponse.json(result);
}
