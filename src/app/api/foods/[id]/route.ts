import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const food = await prisma.food.findUnique({ where: { id } });
  if (!food) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (food.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.food.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
