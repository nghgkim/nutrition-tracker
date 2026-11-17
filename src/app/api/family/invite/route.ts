import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { randomBytes } from "node:crypto";
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await prisma.familyMember.findFirst({ where: { userId: user.id } });
  if (!membership || membership.role !== "owner") return NextResponse.json({ error: "Only owner can invite" }, { status: 403 });
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const token = randomBytes(16).toString("hex");
  const inv = await prisma.familyInvitation.create({ data: { familyId: membership.familyId, email, token } });
  return NextResponse.json({ invitation: { id: inv.id, email: inv.email, status: inv.status } }, { status: 201 });
}
