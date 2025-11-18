/* ======================================================
   DoctorCare — Service Worker
   Advanced Static + Runtime Cache
   ====================================================== */

const CACHE_NAME = "doctorcare-cache-v1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./assets/doctorcare-logo.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable.png"
];

// Install — Cache core files
self.addEventListener("install", (event) => {
  console.log("DoctorCare SW: Installing…");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("DoctorCare SW: Caching core assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );

  self.skipWaiting();
});

// Activate — Cleanup old caches
self.addEventListener("activate", (event) => {
  console.log("DoctorCare SW: Activated");

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("DoctorCare SW: Removing old cache:", key);
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// Fetch — Cache-first strategy for static assets
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only GET requests should be cached
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // Cache fetched files
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, res.clone());
            return res;
          });
        })
        .catch(() => {
          // Offline fallback
          if (req.destination === "document") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
