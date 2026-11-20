import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
const FIELD: Record<string, "protein" | "fat" | "carbs" | "calories"> = {
  protein: "protein", iron: "calories", calcium: "calories",
};
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const nutrient = new URL(req.url).searchParams.get("nutrient") || "protein";
  if (!FIELD[nutrient]) return NextResponse.json(problemResponse("invalid nutrient", 400), { status: 400 });
  const foods = await prisma.food.findMany({
    where: { userId: null, [FIELD[nutrient]]: { gt: 0 } },
    orderBy: { [FIELD[nutrient]]: "desc" },
    take: 5,
    select: { name: true, calories: true, protein: true, carbs: true, fat: true },
  });
  return NextResponse.json({ nutrient, foods });
}
