// =====================================
// DoctorCare PWA — Service Worker (v3)
// Author: Rohith Annadatha
// =====================================

const CACHE_NAME = 'doctorcare-v3';

// ✅ Adjusted file paths to match your real folder structure
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './app.js',
  './assets/doctorcare-logo.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

// ==============================
// INSTALL EVENT
// ==============================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
  console.log('✅ DoctorCare service worker installed');
});

// ==============================
// ACTIVATE EVENT
// ==============================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ Removing old cache:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
  console.log('🚀 DoctorCare service worker activated');
});

// ==============================
// FETCH EVENT (Cache-first strategy)
// ==============================
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Serve from cache first, else fetch online
      return (
        response ||
        fetch(event.request)
          .then((fetchRes) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, fetchRes.clone());
              return fetchRes;
            });
          })
          .catch(() =>
            // Fallback for offline visits (optional)
            caches.match('./index.html')
          )
      );
    })
  );
});
