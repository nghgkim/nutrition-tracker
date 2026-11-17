import { prisma } from "./prisma";
import * as webpush from "web-push";

const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const priv = process.env.VAPID_PRIVATE_KEY;
if (pub && priv) webpush.setVapidDetails("mailto:admin@nutrition-tracker.local", pub, priv);

let started = false;

export async function sendDueReminders(): Promise<number> {
  let sent = 0;
  try {
      if (!pub || !priv) return sent;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const configs = await prisma.reminderConfig.findMany({ where: { enabled: true, time: hhmm } });
      for (const c of configs) {
        // dedup per (user, meal, date)
        try {
          await prisma.reminderLog.create({ data: { userId: c.userId, mealType: c.mealType, date: today } });
        } catch { continue; } // already sent today
        const subs = await prisma.pushSubscription.findMany({ where: { userId: c.userId } });
        const label = c.mealType === "breakfast" ? "🌅 Bữa sáng" : c.mealType === "lunch" ? "☀️ Bữa trưa" : "🌙 Bữa tối";
        await Promise.allSettled(subs.map(s =>
          webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: label, body: "Đừng quên ghi nhận món ăn nhé!", tag: `meal-${c.mealType}` }))
        ));
        sent += subs.length;
      }
    } catch (e) { console.error("[REMINDER] tick failed", e); }
  return sent;
}

export function startReminderScheduler() {
  if (started) return;
  started = true;
  const msToNextMin = 60000 - (Date.now() % 60000);
  setTimeout(() => { sendDueReminders(); setInterval(() => { sendDueReminders(); }, 60000); }, msToNextMin);
  console.log("[REMINDER] in-process scheduler started");
}
