import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!me || me.role !== "owner") return NextResponse.json({ error: "Only owner can change roles" }, { status: 403 });
  const { role } = await req.json();
  if (!["owner", "member"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  const { id } = await ctx.params;
  const target = await prisma.familyMember.findUnique({ where: { id } });
  if (!target || target.familyId !== me.familyId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.familyMember.update({ where: { id }, data: { role } });
  return NextResponse.json({ ok: true });
}
