/*
 * BTC Risk & Journal — service worker.
 *
 * Design goals (hard constraints):
 *  - SAME-ORIGIN ONLY. Cross-origin requests (e.g. *.supabase.co) are never
 *    intercepted or cached — they fall straight through to the network.
 *  - Never degrade the ONLINE experience. Navigations are network-first so a
 *    Vercel redeploy always serves fresh HTML; static assets are content-
 *    hashed and refreshed in the background (stale-while-revalidate).
 *  - Only same-origin GET requests are ever handled. Everything else (POST,
 *    cross-origin, RSC/data fetches) is left untouched.
 */

const VERSION = "btc-risk-v1";
const CACHE = VERSION;
const OFFLINE_URL = "/offline";
const APP_SHELL = ["/", OFFLINE_URL];

// --- install: precache the tiny app shell, then take over immediately. ------
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(APP_SHELL);
      await self.skipWaiting();
    })(),
  );
});

// --- activate: drop stale caches, claim open clients. -----------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// A response we are willing to cache: must exist, be OK, and be same-origin
// (type "basic"). Opaque (cross-origin/no-cors) and error responses are never
// cached.
function isCacheable(response) {
  return Boolean(response) && response.ok && response.type === "basic";
}

// Same-origin static assets that are safe to serve stale-while-revalidate.
function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static")) return true;
  if (url.pathname === "/manifest.webmanifest") return true;
  return /\.(?:js|css|woff2?|png|jpe?g|gif|svg|webp|avif|ico|json|webmanifest)$/.test(
    url.pathname,
  );
}

// Network-first: always try fresh, cache a copy, fall back to cache then the
// offline page when the network is unavailable.
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (isCacheable(fresh)) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    throw err;
  }
}

// Stale-while-revalidate: serve cache instantly, refresh in the background.
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (isCacheable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await network) || fetch(request);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only same-origin GET requests are ever handled. Bail out early for
  // everything else so cross-origin (Supabase) and non-GET hit the network
  // completely untouched.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first so online users always get fresh content.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Any other same-origin GET (RSC/data fetches, etc.): leave untouched so it
  // goes straight to the network and stays fresh.
});
