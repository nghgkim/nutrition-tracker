import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const configs = await prisma.reminderConfig.findMany({ where: { userId: user.id } });
  return NextResponse.json({ configs });
}
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mealType, time, enabled } = await req.json();
  if (!mealType || !time) return NextResponse.json({ error: "mealType and time required" }, { status: 400 });
  const cfg = await prisma.reminderConfig.upsert({
    where: { userId_mealType: { userId: user.id, mealType } },
    update: { time, enabled: enabled ?? true },
    create: { userId: user.id, mealType, time, enabled: enabled ?? true },
  });
  return NextResponse.json({ config: cfg });
}
