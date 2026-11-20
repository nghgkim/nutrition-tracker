import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const sub = await prisma.pushSubscription.findFirst({ where: { userId: user.id } });
  return NextResponse.json({ subscribed: !!sub });
}
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { endpoint, p256dh, auth } = await req.json();
  if (!endpoint || !p256dh || !auth) return NextResponse.json(problemResponse("subscription keys required", 400), { status: 400 });
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh, auth },
    create: { userId: user.id, endpoint, p256dh, auth },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  await prisma.pushSubscription.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
