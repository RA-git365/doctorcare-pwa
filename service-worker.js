const CACHE_NAME = 'doctorcare-cache-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Cache-first for same-origin GET
  if (req.method === 'GET' && req.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(req).then(cached => {
        return (
          cached ||
          fetch(req).then(res => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
            return res;
          }).catch(() => cached)
        );
      })
    );
  }
});
