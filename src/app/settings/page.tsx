"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, Clock, Check, Smartphone } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/ToastProvider";

interface NotifPrefs {
  enabled: boolean;
  breakfast: string;
  lunch: string;
  dinner: string;
  goalAlert: boolean;
}

const DEFAULT: NotifPrefs = {
  enabled: false,
  breakfast: "08:00",
  lunch: "12:00",
  dinner: "19:00",
  goalAlert: true,
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export default function SettingsPage() {
  const t = useT();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [saved, setSaved] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [locale, setLocale] = useState<"vi" | "en">("vi");
  const [msg, setMsg] = useState("");
  const { success, error: showError } = useToast();
  const [sharing, setSharing] = useState({ exercise: false, finance: false, weight: false });

  useEffect(() => {
    const stored = localStorage.getItem("nt-notif");
    if (stored) setPrefs(JSON.parse(stored));
    if ("Notification" in window) setPermission(Notification.permission);
    fetch("/api/push").then(r => r.json()).then(d => setPushSubscribed(d.subscribed)).catch(() => {});
    fetch("/api/locale").then(r => r.json()).then(d => setLocale(d.locale)).catch(() => {});
    fetch("/api/sharing").then(r => r.json()).then(d => setSharing(prev => d.sharing || prev)).catch(() => {});
  }, []);

  async function requestPermission() {
    if (!("Notification" in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") {
      setPrefs((prev) => ({ ...prev, enabled: true }));
      save({ ...prefs, enabled: true });
    }
  }

  async function togglePush() {
    if (!("serviceWorker" in navigator) || !VAPID_PUBLIC_KEY) { setMsg("Push chưa được cấu hình (VAPID key)"); return; }
    if (pushSubscribed) {
      const res = await fetch("/api/push", { method: "DELETE" }); if (res.ok) success("Đã tắt thông báo");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      await sub?.unsubscribe();
      setPushSubscribed(false);
    } else {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;
      // Force refresh Service Worker so the push-event listener (v2) is active
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.update()));
      navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>(resolve => {
          navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
          setTimeout(resolve, 1500); // fallback
        });
      }
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource });
      const json = sub.toJSON();
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }) });
      if (res.ok) { success("Đã bật thông báo"); setPushSubscribed(true); } else showError("Không thể bật thông báo");
      // Auto send a confirmation push
      fetch("/api/push/test", { method: "POST" }).catch(() => {});
    }
  }
  async function sendTestPush() {
    const res = await fetch("/api/push/test", { method: "POST" });
    const d = await res.json();
    if (res.ok) {
      const domain = d.details?.[0]?.endpoint?.match(/https:\/\/([^/]+)/)?.[1] || "push service";
      setMsg(`Đã gửi ${d.sent} thông báo tới ${domain}. Nếu chưa hiện: kiểm tra quyền Notification của site trong thanh địa chỉ (biểu tượng khóa), và đảm bảo đang dùng đúng browser đã bật thông báo.`);
    } else {
      setMsg(d.error || "Lỗi gửi"); showError(d.error || "Không thể gửi thông báo thử");
    }
  }
  async function toggleShare(key: "exercise" | "finance" | "weight") {
    const next = { ...sharing, [key]: !sharing[key] };
    setSharing(next);
    const res = await fetch("/api/sharing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) }); if (res.ok) success("Đã cập nhật chia sẻ"); else showError("Không thể cập nhật chia sẻ");
  }
  async function changeLocale(l: "vi" | "en") { setLocale(l); const res = await fetch("/api/locale", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: l }) }); window.dispatchEvent(new Event("localechange")); if (res.ok) success("Đã đổi ngôn ngữ"); }

  function save(p: NotifPrefs) {
    localStorage.setItem("nt-notif", JSON.stringify(p));
    setPrefs(p);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    scheduleNotifications(p);
    // Persist meal times to server-side scheduler
    Promise.all(([["breakfast", p.breakfast], ["lunch", p.lunch], ["dinner", p.dinner]] as const).map(([mealType, time]) =>
      fetch("/api/reminders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mealType, time, enabled: p.enabled }) })
    )).then(results => {
      if (results.every(r => r.ok)) success("Đã lưu giờ nhắc nhở");
      else showError("Không thể lưu một số giờ nhắc nhở");
    }).catch(() => showError("Không thể lưu giờ nhắc nhở"));
  }

  function scheduleNotifications(p: NotifPrefs) {
    if (!p.enabled || permission !== "granted") return;
    // Clear existing
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(() => {
        // Use setTimeout for in-page reminders (best effort)
      });
    }
    // Schedule via setTimeout for today's remaining reminders
    const now = new Date();
    const meals = [
      { time: p.breakfast, title: "🌅 Bữa sáng", body: "Đừng quên ghi nhận bữa sáng của bạn!" },
      { time: p.lunch, title: "☀️ Bữa trưa", body: "Đã đến giờ bữa trưa. Ghi nhận món ăn nhé!" },
      { time: p.dinner, title: "🌙 Bữa tối", body: "Bữa tối của bạn thế nào? Ghi nhận ngay!" },
    ];
    for (const m of meals) {
      const [h, min] = m.time.split(":").map(Number);
      const target = new Date();
      target.setHours(h, min, 0, 0);
      if (target > now) {
        const delay = target.getTime() - now.getTime();
        setTimeout(() => {
          new Notification(m.title, { body: m.body, icon: "/icon-192.png" });
        }, delay);
      }
    }
  }

  function disable() {
    save({ ...prefs, enabled: false });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cài đặt</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("settings")}</h1>
      </div>

      {/* Permission card */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${permission === "granted" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
            {permission === "granted" ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Quyền thông báo</div>
            <div className="text-xs text-muted-foreground">
              {permission === "granted" ? "Đã cấp quyền" : permission === "denied" ? "Đã từ chối — vào cài đặt trình duyệt để bật lại" : "Chưa cấp quyền"}
            </div>
          </div>
          {permission !== "granted" && permission !== "denied" && (
            <button onClick={requestPermission} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]">
              Cấp quyền
            </button>
          )}
        </div>
      </div>

      {/* Meal reminders */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Nhắc nhở bữa ăn</h2>
        <p className="text-xs text-muted-foreground">Nhận thông báo nhắc ghi nhận món ăn vào các giờ đã đặt.</p>
        {[
          { key: "breakfast" as const, label: "🌅 Bữa sáng" },
          { key: "lunch" as const, label: "☀️ Bữa trưa" },
          { key: "dinner" as const, label: "🌙 Bữa tối" },
        ].map((m) => (
          <div key={m.key} className="flex items-center justify-between gap-4">
            <label className="text-sm text-foreground">{m.label}</label>
            <input type="time" value={prefs[m.key]} onChange={(e) => setPrefs({ ...prefs, [m.key]: e.target.value })}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/60">
          <label className="text-sm text-foreground">Thông báo khi đạt mục tiêu calo</label>
          <button onClick={() => setPrefs({ ...prefs, goalAlert: !prefs.goalAlert })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs.goalAlert ? "bg-primary" : "bg-muted"}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs.goalAlert ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={() => save(prefs)} disabled={permission !== "granted"}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50">
          <Check className="h-4 w-4" /> Lưu cài đặt
        </button>
        {prefs.enabled && permission === "granted" && (
          <button onClick={disable} className="text-sm text-muted-foreground hover:text-destructive">Tắt thông báo</button>
        )}
        {saved && <span className="text-sm text-primary">Đã lưu!</span>}
      </div>

      {/* PWA install hint */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Smartphone className="h-5 w-5" /></span>
          <div>
            <div className="text-sm font-semibold text-foreground">Cài đặt như ứng dụng</div>
            <div className="text-xs text-muted-foreground">Mở menu trình duyệt → &ldquo;Thêm vào màn hình chính&rdquo; (Add to Home Screen) để dùng như app.</div>
          </div>
        </div>
      </div>

      {/* Push notification that fire even when tab is closed */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${pushSubscribed ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}><Bell className="h-5 w-5" /></span>
            <div>
              <div className="text-sm font-semibold text-foreground">Thông báo đẩy (Web Push)</div>
              <div className="text-xs text-muted-foreground">Nhận nhắc bữa ăn ngay cả khi đã đóng tab.</div>
            </div>
          </div>
          <button onClick={togglePush} disabled={!VAPID_PUBLIC_KEY} className={`rounded-lg px-4 py-2 text-sm font-medium shadow-sm active:scale-[0.98] disabled:opacity-50 ${pushSubscribed ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}>
            {pushSubscribed ? "Tắt" : "Bật thông báo"}
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          {pushSubscribed && <button onClick={sendTestPush} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Gửi thông báo thử</button>}
        </div>
        {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
      </div>

      {/* Family sharing */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated space-y-3">
        <div className="text-sm font-semibold text-foreground">Chia sẻ với gia đình</div>
        <p className="text-xs text-muted-foreground">Mặc định là cá nhân. Bật để thành viên xem dữ liệu của bạn trong tab tương ứng.</p>
        {([
          { key: "exercise" as const, label: "🏃 Tập luyện" },
          { key: "finance" as const, label: "💰 Chi tiêu" },
          { key: "weight" as const, label: "⚖️ Cân nặng" },
        ]).map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{item.label}</span>
            <button onClick={() => toggleShare(item.key)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sharing[item.key] ? "bg-primary" : "bg-muted"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${sharing[item.key] ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        ))}
      </div>

      {/* i18n */}
      <div className="rounded-2xl border border-border/60 bg-card p-6 elevated">
        <div className="text-sm font-semibold text-foreground">Ngôn ngữ / Language</div>
        <div className="mt-3 flex gap-2">
          {(["vi", "en"] as const).map(l => (
            <button key={l} onClick={() => changeLocale(l)} className={`rounded-lg border px-4 py-2 text-sm transition-colors ${locale === l ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
              {l === "vi" ? "🇻🇳 Tiếng Việt" : "🇬🇧 English"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
