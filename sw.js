const CACHE_NAME = 'rutas-dot-v53';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// ── Handle messages from the page (show notifications) ──────────
self.addEventListener('message', event => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SCHEDULE_NOTIFICATION') {
    const delay = data.delay || 0;
    const show = () => {
      self.registration.showNotification(data.title || 'HOS Tracker', {
        body:    data.body  || '',
        icon:    data.icon  || './HOS_Tracker_Version1.png',
        badge:   './HOS_Tracker_Version1.png',
        tag:     data.tag   || 'hos-chat',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        data: { url: './' }
      });
    };
    if (delay > 0) setTimeout(show, delay);
    else show();
    return;
  }

  if (data.type === 'HOS_ALERT') {
    self.registration.showNotification('HOS Tracker', {
      body:    data.body || 'Alerta HOS',
      icon:    './HOS_Tracker_Version1.png',
      badge:   './HOS_Tracker_Version1.png',
      tag:     'hos-alert',
      vibrate: [300, 150, 300],
      requireInteraction: true,
      data: { url: './' }
    });
  }
});

// ── Handle notification tap — open or focus the app ─────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
