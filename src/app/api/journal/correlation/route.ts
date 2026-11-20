import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { journalCorrelation, monthRange } from "@/lib/journal";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const q = new URL(req.url).searchParams;
  const now = new Date();
  const range = monthRange(
    Number(q.get("year")) || now.getUTCFullYear(),
    Number(q.get("month")) || now.getUTCMonth() + 1
  );
  const [entries, logs] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId: user.id, date: { gte: new Date(range.from), lte: new Date(`${range.to}T23:59:59.999Z`) } },
      orderBy: { date: "asc" },
    }),
    prisma.foodLog.findMany({
      where: { userId: user.id, date: { gte: new Date(range.from), lte: new Date(`${range.to}T23:59:59.999Z`) } },
      include: { food: true },
    }),
  ]);
  const moods = journalCorrelation(
    entries.map(e => ({
      id: e.id, date: e.date.toISOString().slice(0, 10), note: e.note,
      mood: e.mood, energy: e.energy, tags: e.tags ? JSON.parse(e.tags) : null,
    })),
    logs.map(l => ({ date: l.date.toISOString().slice(0, 10), calories: l.food.calories * l.quantity }))
  );
  return NextResponse.json({ moods });
}
