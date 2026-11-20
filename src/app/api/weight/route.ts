import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const logs = await prisma.weightLog.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { weight, date, note } = await req.json();
  if (weight === undefined) return NextResponse.json(problemResponse("weight required", 400), { status: 400 });
  const log = await prisma.weightLog.upsert({
    where: { userId_date: { userId: user.id, date: new Date(date || new Date().toISOString().slice(0, 10)) } },
    update: { weight: Number(weight), note: note ?? null },
    create: { userId: user.id, weight: Number(weight), date: new Date(date || new Date().toISOString().slice(0, 10)), note: note ?? null },
  });
  return NextResponse.json({ log }, { status: 201 });
}
