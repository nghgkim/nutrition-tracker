import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const inv = await prisma.familyInvitation.findUnique({ where: { id } });
  if (!inv || inv.status !== "pending") return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
  if (inv.email.toLowerCase() !== user.email.toLowerCase()) return NextResponse.json({ error: "Invitation for different email" }, { status: 403 });
  const existing = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (existing) return NextResponse.json({ error: "Already in a family" }, { status: 409 });
  await prisma.$transaction([
    prisma.familyMember.create({ data: { familyId: inv.familyId, userId: user.id } }),
    prisma.familyInvitation.update({ where: { id }, data: { status: "accepted" } }),
  ]);
  return NextResponse.json({ ok: true });
}
