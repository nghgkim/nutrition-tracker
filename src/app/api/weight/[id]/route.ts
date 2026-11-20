import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { id } = await ctx.params;
  const log = await prisma.weightLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json(problemResponse("Not found", 404), { status: 404 });
  if (log.userId !== user.id) return NextResponse.json(problemResponse("Forbidden", 403), { status: 403 });
  await prisma.weightLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
