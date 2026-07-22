/*
 * Service worker for offline support (local-first).
 *
 * A browser reload always fetches the page HTML from the network, so without
 * this a hard reload while offline fails — even though the document content is
 * safe in IndexedDB. This worker caches what's needed so previously-visited
 * pages load offline; the editor then reads its content from IndexedDB with no
 * network at all.
 *
 * Strategies:
 *   - /_next/static/*   → cache-first (content-hashed, immutable).
 *   - navigations/other → network-first, fall back to cache when offline.
 *   - /api/* & non-GET  → never cached (auth + mutations must hit the network).
 */

const CACHE = "collabdoc-v1";
const PRECACHE = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only same-origin GETs are cacheable. Never touch auth/API routes.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Immutable build assets → cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Everything else (page navigations, RSC) → network-first, cache fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/"))),
  );
});
