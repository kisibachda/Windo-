// Service Worker for WinDo Task Notifier

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch handler to meet PWA requirements.
  // In a production build, this would handle caching for offline support.
  event.respondWith(fetch(event.request));
});