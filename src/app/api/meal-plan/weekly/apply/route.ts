import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { meals } = await req.json(); // [{name, calories}]
  if (!Array.isArray(meals) || meals.length === 0) return NextResponse.json({ error: "meals required" }, { status: 400 });
  // resolve foods by name, create logs transactionally
  const names = meals.map((m:{name:string})=>m.name);
  const foods = await prisma.food.findMany({ where: { name: { in: names }, userId: null } });
  const byName = new Map(foods.map(f=>[f.name,f]));
  const today = new Date().toISOString().slice(0,10);
  const created = await prisma.$transaction(
    foods.map(f => prisma.foodLog.create({ data: { userId: user.id, foodId: f.id, quantity: 1, date: new Date(today) } }))
  );
  return NextResponse.json({ created: created.length, skipped: names.length - created.length });
}
