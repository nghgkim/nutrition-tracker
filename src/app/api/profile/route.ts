import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { toNullableNumber } from "@/lib/profile-values";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, height: true, age: true, gender: true, activity: true, targetWeight: true },
  });
  return NextResponse.json({ profile: full });
}

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const { height, age, gender, activity, targetWeight } = await req.json();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      height: toNullableNumber(height),
      age: toNullableNumber(age),
      gender: gender ?? undefined,
      activity: activity ?? undefined,
      targetWeight: toNullableNumber(targetWeight),
    },
    select: { id: true, email: true, name: true, height: true, age: true, gender: true, activity: true, targetWeight: true },
  });
  return NextResponse.json({ profile: updated });
}
