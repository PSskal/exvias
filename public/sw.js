const CACHE_NAME = "exviass-shell-v1";
const STATIC_ASSETS = [
  "/",
  "/brand/exviass-app-icon.png",
  "/brand/exviass-pwa-192.png",
  "/brand/exviass-pwa-512.png",
  "/brand/exviass-logo.png",
  "/brand/exviass-van-hero.png",
  "/cars/transparent/avanzanegro-transparent.png",
  "/cars/transparent/avanzarojo-transparent.png",
  "/cars/transparent/avanzaverde-transparent.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/server")) return;

  if (
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/cars/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      }),
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match("/") || Response.error()));
});
