import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await prisma.familyMember.findFirst({ where: { userId: user.id }, include: { family: true } });
  if (!membership) return NextResponse.json({ family: null, members: [] });
  const members = await prisma.familyMember.findMany({
    where: { familyId: membership.familyId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ family: membership.family, members });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (existing) return NextResponse.json({ error: "Already in a family" }, { status: 409 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const family = await prisma.family.create({
    data: { name, ownerId: user.id, members: { create: { userId: user.id, role: "owner" } } },
  });
  return NextResponse.json({ family }, { status: 201 });
}
