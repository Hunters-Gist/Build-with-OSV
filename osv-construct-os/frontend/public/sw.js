const CACHE_NAME = 'osv-construct-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Let non-GET requests pass through untouched.
  if (request.method !== 'GET') return;

  // API requests should always be network-first (no cache writes).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        const isAiRequest = url.pathname.startsWith('/api/ai/');
        return new Response(
          JSON.stringify(
            isAiRequest
              ? { error: 'No connection. Generating quotes requires internet.', retry_allowed: true }
              : { error: 'Offline mode. Changes saved locally and queued for sync.' }
          ),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 503
          }
        );
      })
    );
    return;
  }

  // App shell navigation: prefer network, fallback to cached index.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedShell = await caches.match('/index.html');
          return cachedShell || Response.error();
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request);
      const networkPromise = fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || !networkResponse.ok || networkResponse.bodyUsed) {
            return networkResponse;
          }
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) {
        return cachedResponse;
      }

      const networkResponse = await networkPromise;
      return networkResponse || Response.error();
    })()
  );
});
