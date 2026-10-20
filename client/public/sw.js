/**
 * Safe Progressive Web App Service Worker for VK BANKER'S
 * Version: 1.0.0
 * 
 * Strict Privacy & Security Rules:
 * 1. NEVER cache /api/* endpoints or authenticated financial data.
 * 2. NEVER cache customer records, loans, repayments, or auth tokens.
 * 3. Pre-cache only public static shell assets and offline fallback.
 * 4. Network-first for HTML navigations to ensure latest ledger updates.
 * 5. Safe cache-cleanup on version updates.
 */

const CACHE_NAME = 'vk-bankers-pwa-v1.0.0';

const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/offline.html',
];

// Install: Cache public static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never cache non-GET requests (POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // 2. PRIVACY & SECURITY: NEVER cache backend API requests or sensitive financial data
  if (url.pathname.startsWith('/api/') || request.headers.has('Authorization')) {
    event.respondWith(fetch(request));
    return;
  }

  // 3. HTML Navigation requests (pages): Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, update shell cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Completely offline: serve cached index.html or offline fallback
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const cachedIndex = await caches.match('/');
          if (cachedIndex) return cachedIndex;
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // 4. Static assets (Vite hashed bundles in /assets/, fonts, icons): Stale-While-Revalidate
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.webmanifest') ||
    url.origin.includes('fonts.googleapis.com') ||
    url.origin.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Ignore fetch errors if already cached
          });

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 5. Default network fetch for all other requests
  event.respondWith(fetch(request));
});

// Support for skip-waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
