import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const me = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!me || me.role !== "owner") return NextResponse.json(problemResponse("Only owner can remove members", 403), { status: 403 });
  const { id } = await ctx.params; // member record id (FamilyMember.id)
  const target = await prisma.familyMember.findUnique({ where: { id } });
  if (!target || target.familyId !== me.familyId) return NextResponse.json(problemResponse("Not found", 404), { status: 404 });
  if (target.role === "owner") return NextResponse.json(problemResponse("Cannot remove owner", 400), { status: 400 });
  await prisma.familyMember.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
