// public/sw.js
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Simple network-first strategy for basic offline support
  // This is a minimal implementation.
  if (event.request.method !== 'GET') return
  
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
