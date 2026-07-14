const CACHE_NAME = 'vybi-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/admin/clubs',
  '/admin/analytics',
  '/manifest.webmanifest',
  // Icons
  '/icons/72x72.png',
  '/icons/96x96.png',
  '/icons/128x128.png',
  '/icons/144x144.png',
  '/icons/152x152.png',
  '/icons/192x192.png',
  '/icons/384x384.png',
  '/icons/512x512.png'
];

self.addEventListener('install', event => {
  // Take over from any previously-registered SW as soon as this one finishes installing,
  // instead of waiting for every open tab/installed-PWA instance to fully close first.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Only ever intercept same-origin GET requests. POST requests (Server Actions like
  // form submissions and data fetches) can't be cached and must reach the network
  // untouched, and cross-origin requests (e.g. Firebase's securetoken.googleapis.com
  // token refresh) should never be proxied through the SW at all — doing so breaks
  // both in ways that surface as generic "Failed to fetch" errors.
  if (event.request.method !== 'GET') {
    return;
  }
  if (new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  // Navigations (HTML documents) go network-first: a cached HTML shell references a
  // specific build's JS chunk hashes, which no longer exist once a new version deploys,
  // so serving it cache-first crashes the app. Only fall back to the cache if the
  // network is genuinely unreachable (offline).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets (icons, manifest, hashed JS/CSS) are safe to serve cache-first.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
