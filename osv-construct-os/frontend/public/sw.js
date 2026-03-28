const CACHE_NAME = 'osv-construct-v1';
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

self.addEventListener('fetch', (event) => {
  // If it's an API request, specifically AI Quote Engine, ignore cache
  if (event.request.url.includes('/api/ai/')) {
    event.respondWith(fetch(event.request).catch(() => {
       return new Response(JSON.stringify({ error: "No connection. Generating quotes requires internet.", retry_allowed: true }), {
         headers: { 'Content-Type': 'application/json' },
         status: 503
       });
    }));
    return;
  }
  
  // Offline sync strategy: Stale-while-revalidate for UI assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (event.request.method === 'GET' && !event.request.url.includes('/api/')) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for generic API calls when offline
        if (event.request.url.includes('/api/')) {
           return new Response(JSON.stringify({ error: "Offline mode. Changes saved locally and queued for sync." }), {
             headers: { 'Content-Type': 'application/json' },
             status: 503
           });
        }
      });
      return cachedResponse || fetchPromise;
    })
  );
});
