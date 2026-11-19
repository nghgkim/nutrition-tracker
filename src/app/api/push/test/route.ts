import { NextResponse } from "next/server";
import * as webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
if (publicKey && privateKey) webpush.setVapidDetails("mailto:admin@nutrition-tracker.local", publicKey, privateKey);

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!publicKey || !privateKey) return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
  if (subs.length === 0) return NextResponse.json({ error: "No subscription" }, { status: 404 });

  const results = await Promise.allSettled(subs.map((s) =>
    webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify({ title: "🥗 thuypn by kimnh", body: "Thông báo thử nghiệm đã hoạt động!", tag: "test" })
    )
  ));
  const details = results.map((r, i) => ({
    endpoint: subs[i].endpoint.slice(0, 50) + "...",
    status: r.status === "fulfilled" ? (r.value as { statusCode?: number }).statusCode : "FAILED: " + String((r as PromiseRejectedResult).reason).slice(0, 150),
  }));
  const failed = results.filter(r => r.status === "rejected");
  console.log("[PUSH TEST] results:", JSON.stringify(details));
  return NextResponse.json({ ok: failed.length === 0, sent: subs.length, failed: failed.length, details });
}
