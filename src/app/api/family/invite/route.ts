import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!membership || membership.role !== "owner") return NextResponse.json({ error: "Only owner can invite" }, { status: 403 });
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const existing = await prisma.familyMember.findFirst({ where: { userId: invitee.id } });
  if (existing) return NextResponse.json({ error: "Already in a family" }, { status: 409 });
  await prisma.familyMember.create({ data: { familyId: membership.familyId, userId: invitee.id } });
  return NextResponse.json({ invited: true });
}
