import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const log = await prisma.exerciseLog.findUnique({ where: { id } });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (log.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.exerciseLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
