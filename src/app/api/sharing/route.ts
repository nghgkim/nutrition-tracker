import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { shareExercise: true, shareFinance: true, shareWeight: true } });
  return NextResponse.json({ sharing: u });
}
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { exercise, finance, weight } = await req.json();
  const u = await prisma.user.update({
    where: { id: user.id },
    data: { shareExercise: exercise ?? undefined, shareFinance: finance ?? undefined, shareWeight: weight ?? undefined },
    select: { shareExercise: true, shareFinance: true, shareWeight: true },
  });
  return NextResponse.json({ sharing: u });
}
