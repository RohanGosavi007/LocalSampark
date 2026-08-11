const CACHE_NAME = 'localsampark-v1';

// Install a service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // We don't cache everything by default yet, just the bare minimum 
      // so it registers as a valid PWA offline app
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

// Cache and return requests
self.addEventListener('fetch', event => {
  // Bypass Next.js internal routes and HMR
  if (event.request.url.includes('/_next/') || event.request.url.includes('__nextjs')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      // Fallback to network
      return response || fetch(event.request).catch(() => {
        return caches.match('/');
      });
    })
  );
});

// Update a service worker
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
  self.clients.claim();
});

// Handle Push Notifications
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'LocalSampark Alert', body: 'New notification received.' };
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
