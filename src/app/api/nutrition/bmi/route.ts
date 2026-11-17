import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { classifyBMI } from "@/lib/bmi-asian";
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const weight = Number(q.get("weight")), height = Number(q.get("height"));
  if (!(weight > 0) || !(height > 0)) return NextResponse.json({ error: "weight and height required" }, { status: 400 });
  const gender = (q.get("gender") || "male") as "male" | "female";
  const waist = q.get("waist") ? Number(q.get("waist")) : null;
  const bmi = weight / Math.pow(height / 100, 2);
  return NextResponse.json(classifyBMI(bmi, gender, waist));
}
