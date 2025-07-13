const CACHE_NAME = 'nightpulse-v1';
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
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
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
