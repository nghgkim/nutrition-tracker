import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const membership = await prisma.familyMember.findFirst({ where: { userId: user.id }, include: { family: true } });
  if (!membership) return NextResponse.json(problemResponse("Not in a family", 403), { status: 403 });
  const members = await prisma.familyMember.findMany({
    where: { familyId: membership.familyId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const invitations = await prisma.familyInvitation.findMany({ where: { familyId: membership.familyId, status: "pending" } });
  return NextResponse.json({ family: membership.family, members, invitations });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const existing = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (existing) return NextResponse.json(problemResponse("Already in a family", 409), { status: 409 });
  const { name } = await req.json();
  if (!name) return NextResponse.json(problemResponse("name required", 400), { status: 400 });
  const family = await prisma.family.create({
    data: { name, ownerId: user.id, members: { create: { userId: user.id, role: "owner" } } },
  });
  return NextResponse.json({ family }, { status: 201 });
}
