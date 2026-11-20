import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const logs = await prisma.exerciseLog.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } });
  const days = new Set(logs.map(l => l.date.toISOString().slice(0, 10)));
  // streak counting back from today (or yesterday if today not yet logged)
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1); }
  // 7-day trend
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(); dd.setDate(dd.getDate() - i);
    const key = dd.toISOString().slice(0, 10);
    trend.push({ date: key, calories: logs.filter(l => l.date.toISOString().slice(0, 10) === key).reduce((s, l) => s + l.calories, 0) });
  }
  return NextResponse.json({ streak, trend });
}
