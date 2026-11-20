import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { sendDueReminders } from "@/lib/reminder-scheduler";
import { getSecret } from "@/lib/secret";
export async function GET(req: Request) {
  // Internal cron tick via secret header (public path /api/auth, no middleware block)
  if (req.headers.get("authorization") === `Bearer ${getSecret("CRON_SECRET")}`) {
    const sent = await sendDueReminders();
    return NextResponse.json({ cron: true, sent });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
