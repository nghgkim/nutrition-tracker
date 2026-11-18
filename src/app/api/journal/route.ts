import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = new URL(req.url).searchParams.get("date");
  const where = date ? { userId: user.id, date: new Date(date) } : { userId: user.id };
  const entries = await prisma.journalEntry.findMany({ where, orderBy: { date: "asc" } });
  return NextResponse.json({ entries });
}
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const date = new URL(req.url).searchParams.get("date") || body.date;
  const { note, mood, energy } = body;
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });
  const entry = await prisma.journalEntry.upsert({
    where: { userId_date: { userId: user.id, date: new Date(date) } },
    update: { note: note ?? null, mood: mood ?? null, energy: energy ?? null },
    create: { userId: user.id, date: new Date(date), note: note ?? null, mood: mood ?? null, energy: energy ?? null },
  });
  return NextResponse.json({ entry });
}
