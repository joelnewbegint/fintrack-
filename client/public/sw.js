/**
 * Safe Progressive Web App Service Worker for VK BANKER'S
 * Version: 1.0.2
 * 
 * Strict Privacy & Security Rules:
 * 1. NEVER cache /api/* endpoints or authenticated financial data.
 * 2. NEVER cache customer records, loans, repayments, or auth tokens.
 * 3. Never cache stale HTML entry chunks that break Vite deployments.
 * 4. Network-first for all navigations; fallback to /offline.html only when offline.
 * 5. Automatic cache purge on version updates.
 */

const CACHE_NAME = 'vk-bankers-pwa-v1.0.2';

const STATIC_SHELL_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/offline.html',
];

// Install: Cache public static icons & offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up all old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('Purging old service worker cache:', name);
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

  // 3. HTML Navigation requests (pages): Always Network-first to ensure latest deploy
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(async () => {
          // Completely offline: serve cached offline fallback
          const offlineFallback = await caches.match('/offline.html');
          if (offlineFallback) return offlineFallback;
          return new Response('Network unavailable. Please reconnect to internet.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // 4. Static assets (Vite hashed bundles in /assets/, fonts, icons)
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
        // If cached, return cached immediately
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Guard against HTML rewrites for deleted JS chunks
            const contentType = networkResponse.headers.get('content-type') || '';
            if (url.pathname.endsWith('.js') && contentType.includes('text/html')) {
              // Deleted chunk returned index.html fallback - do not cache
              return networkResponse;
            }

            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);
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
