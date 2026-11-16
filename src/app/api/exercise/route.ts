import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const logs = await prisma.exerciseLog.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } });
  return NextResponse.json({ logs });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { type, duration, calories, date } = await req.json();
  if (!type || !duration || calories === undefined) return NextResponse.json({ error: "type, duration, calories required" }, { status: 400 });
  const log = await prisma.exerciseLog.create({
    data: { userId: user.id, type, duration: Number(duration), calories: Number(calories), date: new Date(date || new Date().toISOString().slice(0, 10)) },
  });
  return NextResponse.json({ log }, { status: 201 });
}
