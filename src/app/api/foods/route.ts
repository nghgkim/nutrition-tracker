import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { removeDiacritics } from "@/lib/normalize";
import { parsePositiveNumber } from "@/lib/request-validation";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const all = await prisma.food.findMany({
    where: { OR: [{ userId: null }, { userId: user.id }] },
    orderBy: { name: "asc" },
  });
  const foods = q
    ? all.filter((f) => removeDiacritics(f.name).includes(removeDiacritics(q)))
    : all;
  return NextResponse.json({ foods });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const body = await req.json();
  const { name, calories, protein, carbs, fat, servingSize, source } = body;
  if (!name || calories === undefined) {
    return NextResponse.json(problemResponse("Name and calories required", 400), { status: 400 });
  }
  const kcal = parsePositiveNumber(calories, { min: 1, max: 100_000 });
  const proteinValue = parsePositiveNumber(protein ?? 0, { min: 0, max: 1000 });
  const carbsValue = parsePositiveNumber(carbs ?? 0, { min: 0, max: 1000 });
  const fatValue = parsePositiveNumber(fat ?? 0, { min: 0, max: 1000 });
  if (kcal === null || proteinValue === null || carbsValue === null || fatValue === null) {
    return NextResponse.json(problemResponse("Invalid nutrition values", 400), { status: 400 });
  }
  const food = await prisma.food.create({
    data: {
      name,
      calories: kcal,
      protein: proteinValue,
      carbs: carbsValue,
      fat: fatValue,
      servingSize: servingSize ?? null,
      source: typeof source === "string" && source.length <= 40 ? source : null,
      isCustom: true,
      userId: user.id,
    },
  });
  return NextResponse.json({ food }, { status: 201 });
}
