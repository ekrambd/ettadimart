// ETTADI MART - Progressive Web App Service Worker
const CACHE_NAME = 'ettadimart-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/ettadimart-favicon.svg',
  '/ettadimart-logo.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event - Pre-cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Static cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network-First for HTML/APIs, Stale-While-Revalidate for Static Assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass non-GET requests and external URLs
  if (req.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // API calls & Live routes: Network first, no aggressive caching
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/order') || url.pathname.startsWith('/admin')) {
    return;
  }

  // Static Assets (Images, Icons, Fonts, CSS/JS bundles)
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2|woff|ttf|css|js)$/) ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // HTML Pages: Network-first with offline fallback to cached home page
  event.respondWith(
    fetch(req).catch(() => {
      return caches.match(req).then((response) => {
        return response || caches.match('/');
      });
    })
  );
});
