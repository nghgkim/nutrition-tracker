import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { getCurrentUser } from "@/lib/session";
import { recommendedCalories, type Activity, type Gender } from "@/lib/nutrition-needs";
import { prisma } from "@/lib/prisma";
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const p = await prisma.user.findUnique({ where: { id: user.id }, select: { age: true, gender: true, activity: true } });
  const q = new URL(req.url).searchParams;
  const gender = (q.get("gender") || p?.gender || "male") as Gender;
  const activity = (q.get("activity") || p?.activity || "moderate") as Activity;
  const ageParam = q.get("age");
  const age = ageParam ? Number(ageParam) : (p?.age ?? null);
  return NextResponse.json(recommendedCalories(age, gender, activity));
}
