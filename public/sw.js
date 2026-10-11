/* Lukas · service worker: caché sin conexión y notificaciones push.
 *
 * Estrategias:
 *  - /_next/static, /icons y fuentes: cache-first (son inmutables, llevan hash).
 *  - Navegaciones y datos RSC de Next: network-first con respaldo en caché, para
 *    que la app abra y navegue sin conexión con lo último que se vio.
 *  - Nada de otros orígenes (Supabase, Telegram) ni métodos distintos de GET.
 * Sube VERSION para descartar cachés viejas en el próximo despliegue.
 */
const VERSION = "v2";
const STATIC = `lukas-static-${VERSION}`;
const PAGES = `lukas-pages-${VERSION}`;
const SHELL = ["/", "/pendientes", "/gestionar", "/estadisticas", "/ajustes", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: "reload" })))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("lukas-") && k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStatic = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  /\.(?:woff2?|png|svg|ico)$/.test(url.pathname);

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(request)) || (fallbackUrl && (await cache.match(fallbackUrl)));
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  if (isStatic(url)) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    // detalle /t/:id sin conexión: cae al cascarón de Inicio (los datos están en el dispositivo)
    event.respondWith(networkFirst(request, "/"));
  } else {
    event.respondWith(networkFirst(request));
  }
});

// --- notificaciones push -----------------------------------------------------
// Payload: { title, body, url, tag } (ver src/lib/push/plan.ts)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  const title = data.title || "Lukas";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: data.tag || "lukas",
      renotify: true,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => w.url.startsWith(self.location.origin));
      if (open) return open.focus().then(() => open.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
