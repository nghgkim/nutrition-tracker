import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { id } = await ctx.params;
  const inv = await prisma.familyInvitation.findUnique({ where: { id } });
  if (!inv || inv.status !== "pending") return NextResponse.json(problemResponse("Invalid invitation", 404), { status: 404 });
  if (inv.email.toLowerCase() !== user.email.toLowerCase()) return NextResponse.json(problemResponse("Invitation for different email", 403), { status: 403 });
  const existing = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (existing) return NextResponse.json(problemResponse("Already in a family", 409), { status: 409 });
  await prisma.$transaction([
    prisma.familyMember.create({ data: { familyId: inv.familyId, userId: user.id } }),
    prisma.familyInvitation.update({ where: { id }, data: { status: "accepted" } }),
  ]);
  return NextResponse.json({ ok: true });
}
