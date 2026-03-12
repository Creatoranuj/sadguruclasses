const CACHE_NAME = 'sadguru-coaching-v2';
const MAX_CACHE_ITEMS = 100;
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/branding/logo_primary_web.png',
];

// Install — precache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Trim cache to prevent unbounded growth
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries first
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}

// Fetch — cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // Network-first for Supabase API calls
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              trimCache(CACHE_NAME, MAX_CACHE_ITEMS);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone);
              trimCache(CACHE_NAME, MAX_CACHE_ITEMS);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML navigation (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/') || caches.match('/dashboard'))
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
