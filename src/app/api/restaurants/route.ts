import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const restaurants = await prisma.restaurant.findMany({ orderBy: { rating: "desc" } });
  return NextResponse.json({ restaurants, source: "Foody", scrapedAt: restaurants[0]?.scrapedAt });
}
