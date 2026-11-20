import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const me = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!me || me.role !== "owner") return NextResponse.json(problemResponse("Only owner can change roles", 403), { status: 403 });
  const { role } = await req.json();
  if (!["owner", "member"].includes(role)) return NextResponse.json(problemResponse("Invalid role", 400), { status: 400 });
  const { id } = await ctx.params;
  const target = await prisma.familyMember.findUnique({ where: { id } });
  if (!target || target.familyId !== me.familyId) return NextResponse.json(problemResponse("Not found", 404), { status: 404 });
  await prisma.familyMember.update({ where: { id }, data: { role } });
  return NextResponse.json({ ok: true });
}
