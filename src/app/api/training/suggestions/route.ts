import { NextResponse } from "next/server";
import { problemResponse } from "@/lib/http-problem";
import { EXERCISE_SUGGESTIONS } from "@/lib/guidance";
import { getCurrentUser } from "@/lib/session";
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const goal = new URL(req.url).searchParams.get("goal") || "duy trì";
  return NextResponse.json({ exercises: EXERCISE_SUGGESTIONS[goal] || EXERCISE_SUGGESTIONS["duy trì"] });
}
