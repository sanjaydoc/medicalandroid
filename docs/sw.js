// StemCells Protocol — service worker (app-shell caching + offline fallback).
// Bump CACHE when the shell changes to invalidate old caches — the activate
// handler deletes every cache whose name !== CACHE, so a bump evicts the stale
// shell. Paired with updateViaCache:'none' + a controllerchange reload in
// main.tsx, a new deploy takes effect on the next load with no manual refresh.
// mufllynd is replaced with a unique id at deploy time (scripts/build-pages.mjs)
// so EVERY deploy ships a genuinely different sw.js. That is what makes the browser
// install a new worker, run the activate handler (which deletes old caches), and
// fire controllerchange → the one-time reload in main.tsx. With a constant name the
// worker never changed, so returning visitors stayed frozen on a stale cache.
const CACHE = 'meddroid-mufllynd';
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/pwa-192.png', '/pwa-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // don't let one missing shell asset abort the whole install
    caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()),
  );
});

// allow the page to tell a waiting worker to take over immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle same-origin requests; let the network handle Supabase, fonts,
  // Cloudflare analytics, the chat worker, etc.
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to the cached app shell offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Static assets (hashed JS/CSS, icons): cache-first, then network.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && (res.type === 'basic')) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
