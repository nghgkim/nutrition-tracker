import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { removeDiacritics } from "@/lib/normalize";

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
  const { name, calories, protein, carbs, fat, servingSize } = body;
  if (!name || calories === undefined) {
    return NextResponse.json(problemResponse("Name and calories required", 400), { status: 400 });
  }
  const food = await prisma.food.create({
    data: {
      name,
      calories: Number(calories),
      protein: Number(protein ?? 0),
      carbs: Number(carbs ?? 0),
      fat: Number(fat ?? 0),
      servingSize: servingSize ?? null,
      isCustom: true,
      userId: user.id,
    },
  });
  return NextResponse.json({ food }, { status: 201 });
}
