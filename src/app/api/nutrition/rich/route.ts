import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
const FIELD: Record<string, "protein" | "fat" | "carbs" | "calories"> = {
  protein: "protein", iron: "calories", calcium: "calories",
};
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const nutrient = new URL(req.url).searchParams.get("nutrient") || "protein";
  if (!FIELD[nutrient]) return NextResponse.json({ error: "invalid nutrient" }, { status: 400 });
  const foods = await prisma.food.findMany({
    where: { userId: null, [FIELD[nutrient]]: { gt: 0 } },
    orderBy: { [FIELD[nutrient]]: "desc" },
    take: 5,
    select: { name: true, calories: true, protein: true, carbs: true, fat: true },
  });
  return NextResponse.json({ nutrient, foods });
}
