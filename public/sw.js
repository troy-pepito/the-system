const STATIC_CACHE = "system-static-v2";
const RUNTIME_CACHE = "system-runtime-v2";

const PRECACHE_URLS = ["/", "/portals", "/profile"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { credentials: "include" });
            if (res && res.ok) await cache.put(url, res);
          } catch {}
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (
    url.pathname === "/icon" ||
    url.pathname === "/apple-icon" ||
    url.pathname === "/icon1" ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (url.pathname === "/manifest.webmanifest") {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  const accept = req.headers.get("accept") || "";
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Shivaliva Leveling", body: event.data?.text?.() ?? "" };
  }
  const title = data.title || "Shivaliva Leveling";
  const options = {
    body: data.body || "",
    icon: "/icon1",
    badge: "/icon",
    tag: data.tag || "default",
    renotify: true,
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        try {
          await client.focus();
          if ("navigate" in client && client.url !== targetUrl) {
            await client.navigate(targetUrl);
          }
          return;
        } catch {}
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});