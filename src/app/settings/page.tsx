"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, Clock, Check, Smartphone } from "lucide-react";

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

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [saved, setSaved] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const stored = localStorage.getItem("nt-notif");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setPrefs(JSON.parse(stored));
    if ("Notification" in window) setPermission(Notification.permission);
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

  function save(p: NotifPrefs) {
    localStorage.setItem("nt-notif", JSON.stringify(p));
    setPrefs(p);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    scheduleNotifications(p);
  }

  function scheduleNotifications(p: NotifPrefs) {
    if (!p.enabled || permission !== "granted") return;
    // Clear existing
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Thông báo</h1>
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
    </div>
  );
}
