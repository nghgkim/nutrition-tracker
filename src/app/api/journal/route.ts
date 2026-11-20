import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { problemResponse } from "@/lib/http-problem";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalizeTags } from "@/lib/journal";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const q = new URL(req.url).searchParams;
  const date = q.get("date");
  const from = q.get("from");
  const to = q.get("to");
  const tag = q.get("tag")?.trim();
  const where: Prisma.JournalEntryWhereInput = date
    ? { userId: user.id, date: new Date(date) }
    : from && to
      ? { userId: user.id, date: { gte: new Date(from), lte: new Date(`${to}T23:59:59.999Z`) } }
      : { userId: user.id };
  if (tag) {
    where.journalTags = { some: { tag: { equals: tag, mode: "insensitive" } } };
  }
  const entries = await prisma.journalEntry.findMany({ where, orderBy: { date: "asc" }, include: { journalTags: true } });
  return NextResponse.json({
    entries: entries.map(e => ({
      id: e.id, date: e.date.toISOString().slice(0, 10), note: e.note, mood: e.mood,
      energy: e.energy,
      tags: e.tags ? JSON.parse(e.tags) : e.journalTags.map(t => t.tag),
    })),
  });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const body = await req.json();
  const date = new URL(req.url).searchParams.get("date") || body.date;
  const { note, mood, energy } = body;
  if (!date) return NextResponse.json(problemResponse("date required", 400), { status: 400 });
  const tags = normalizeTags(body.tags);
  const entry = await prisma.journalEntry.upsert({
    where: { userId_date: { userId: user.id, date: new Date(date) } },
    update: { note: note ?? null, mood: mood ?? null, energy: energy ?? null, tags: JSON.stringify(tags) },
    create: { userId: user.id, date: new Date(date), note: note ?? null, mood: mood ?? null, energy: energy ?? null, tags: JSON.stringify(tags) },
  });
  // Dual-write to the queryable table (idempotent via @@unique).
  await prisma.$transaction([
    prisma.journalTag.deleteMany({ where: { entryId: entry.id } }),
    ...tags.map(tag => prisma.journalTag.create({ data: { entryId: entry.id, tag } })),
  ]);
  return NextResponse.json({ entry: { ...entry, tags, date: entry.date.toISOString().slice(0, 10) } });
}
