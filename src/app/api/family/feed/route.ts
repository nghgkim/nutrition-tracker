import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const mine = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!mine) return NextResponse.json({ error: "Not in a family" }, { status: 403 });

  const feature = new URL(req.url).searchParams.get("feature") || "calo";
  const members = await prisma.familyMember.findMany({
    where: { familyId: mine.familyId },
    include: { user: { select: { id: true, name: true, email: true, shareExercise: true, shareFinance: true, shareWeight: true } } },
  });

  const today = new Date().toISOString().slice(0, 10);
  const result = [];
  for (const m of members) {
    const u = m.user;
    let value = 0;
    if (feature === "exercise" && u.shareExercise) {
      const logs = await prisma.exerciseLog.findMany({ where: { userId: u.id, date: new Date(today) } });
      value = logs.reduce((s, l) => s + l.calories, 0);
    } else if (feature === "finance" && u.shareFinance) {
      const logs = await prisma.expense.findMany({ where: { userId: u.id, date: new Date(today) } });
      value = logs.reduce((s, l) => s + l.amount, 0);
    } else if (feature === "weight" && u.shareWeight) {
      const log = await prisma.weightLog.findFirst({ where: { userId: u.id }, orderBy: { date: "desc" } });
      value = log?.weight ?? 0;
    } else if (feature === "calo") {
      const logs = await prisma.foodLog.findMany({ where: { userId: u.id, date: new Date(today) }, include: { food: true } });
      value = logs.reduce((s, l) => s + l.food.calories * l.quantity, 0);
    } else {
      continue; // unknown feature -> no data
    }
    // Only include members who opted in (calo is always shared as before)
    if (feature === "calo" || (feature === "exercise" && u.shareExercise) || (feature === "finance" && u.shareFinance) || (feature === "weight" && u.shareWeight)) {
      result.push({ userId: u.id, name: u.name, email: u.email, value: Math.round(value) });
    }
  }
  return NextResponse.json({ members: result, feature });
}
