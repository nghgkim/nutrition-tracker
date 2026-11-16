const CACHE_NAME = "nutritrack-v2";
const PRECACHE = ["/", "/dashboard", "/foods", "/history", "/profile", "/exercise", "/finance", "/family", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.url.includes("/api/")) return;
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Web Push: receive push event and show notification even when tab is closed
self.addEventListener("push", (event) => {
  let data = { title: "Nutrition Tracker", body: "Nhắc nhở bữa ăn", icon: "/icon-192.png" };
  if (event.data) { try { data = { ...data, ...event.data.json() }; } catch {} }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: "/icon-192.png",
    tag: data.tag || "nutritrack-reminder",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/dashboard"));
});
