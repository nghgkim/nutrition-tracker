import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminder-scheduler";
export async function GET(req: Request) {
  // Internal cron endpoint — protected by shared secret
  const secret = process.env.CRON_SECRET || "nutrition-tracker-cron";
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sent = await sendDueReminders();
  return NextResponse.json({ sent });
}
