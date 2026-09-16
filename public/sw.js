// Hand-rolled service worker (no Workbox — this app has one cache policy
// and a single background-sync tag, not enough surface to justify the
// dependency). Registered from components/ServiceWorkerRegistration.tsx.
//
// Strategy:
//  - Static same-origin GETs (icons, manifest, _next assets): cache-first.
//  - Navigations (loading a page): network-first, falling back to the last
//    cached response for that URL so a caretaker who already opened
//    /caretaker once can reopen it with no signal. This intentionally
//    shows the last-synced snapshot while offline, not a blank error page.
//  - Everything else (API/auth routes, Server Actions, cross-origin):
//    passthrough — never intercepted, so auth and data mutations always
//    hit the network and fail honestly when truly offline (the outbox in
//    lib/outbox.ts is what makes those safe to retry).
const CACHE_NAME = "hauswerk-shell-v1";
const PRECACHE_URLS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // auth + any future route handlers: always live

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/caretaker")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});

// Background Sync can only wake this service worker, which has no React/
// Next runtime and can't invoke a Server Action's encoded RPC — so it
// wakes any open tab instead and lets that tab flush through the same
// server actions a normal online submit would use (lib/outbox-sync.ts).
// If no tab is open, the outbox simply waits for the next page load or
// `online` event, which also triggers a flush.
self.addEventListener("sync", (event) => {
  if (event.tag !== "sync-outbox") return;
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "FLUSH_OUTBOX" }));
    })
  );
});
