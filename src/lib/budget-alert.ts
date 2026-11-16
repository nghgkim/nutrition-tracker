import { prisma } from "./prisma";

export async function checkBudgetAlert(
  budgetKey: string,
  month: string,
  spent: number,
  budget: number,
  userId: string
): Promise<{ threshold: number; spent: number; budget: number } | null> {
  if (budget <= 0) return null;
  const pct = spent / budget;
  const threshold = pct >= 1 ? 100 : pct >= 0.8 ? 80 : 0;
  if (threshold === 0) return null;

  // Dedup: one alert per (budget, month, threshold)
  const existing = await prisma.budgetAlert.findUnique({
    where: { budgetKey_month_threshold: { budgetKey, month, threshold } },
  });
  if (existing) return null;
  await prisma.budgetAlert.create({ data: { budgetKey, month, threshold } });

  // Send push to the user (and household: all family members if household budget)
  try {
    const webpush = await import("web-push");
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (pub && priv) {
      webpush.setVapidDetails("mailto:admin@nutrition-tracker.local", pub, priv);
      let targetUserIds = [userId];
      if (budgetKey.startsWith("household:")) {
        const familyId = budgetKey.split(":")[1];
        const members = await prisma.familyMember.findMany({ where: { familyId }, select: { userId: true } });
        targetUserIds = members.map(m => m.userId);
      }
      const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: targetUserIds } } });
      const label = budgetKey.startsWith("household:") ? "Ngân sách gia đình" : "Ngân sách cá nhân";
      const title = threshold === 100 ? "🚨 Vượt ngân sách" : "⚠️ Gần hết ngân sách";
      const body = `${label} tháng ${month} đã dùng ${Math.round(pct * 100)}% (${spent.toLocaleString("vi-VN")}₫ / ${budget.toLocaleString("vi-VN")}₫)`;
      await Promise.allSettled(subs.map(s =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, tag: `budget-${budgetKey}-${threshold}` }))
      ));
    }
  } catch (e) { console.error("[BUDGET ALERT] push failed", e); }

  return { threshold, spent, budget };
}
