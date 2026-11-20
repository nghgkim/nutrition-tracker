import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const alerts = await prisma.budgetAlert.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({ alerts });
}
