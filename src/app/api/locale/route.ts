import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { locale: true } });
  return NextResponse.json({ locale: u?.locale || "vi" });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { locale } = await req.json();
  if (!["vi", "en"].includes(locale)) return NextResponse.json(problemResponse("Invalid locale", 400), { status: 400 });
  const u = await prisma.user.update({ where: { id: user.id }, data: { locale }, select: { locale: true } });
  return NextResponse.json({ locale: u.locale });
}
