import { NextResponse } from "next/server";
import { getSecret } from "@/lib/secret";
import { problemResponse } from "@/lib/http-problem";
import { sendDueReminders } from "@/lib/reminder-scheduler";
export async function GET(req: Request) {
  // Internal cron endpoint — protected by shared secret
  const secret = getSecret("CRON_SECRET");
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json(problemResponse("Unauthorized", 401), { status: 401 });
  const sent = await sendDueReminders();
  return NextResponse.json({ sent });
}
