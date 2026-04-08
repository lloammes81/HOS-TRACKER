const CACHE_NAME = 'rutas-dot-v51';
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
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

/* ── Notification timers (keyed by tag so we can cancel them) ── */
const _notifTimers = {};

self.addEventListener('message', event => {
  const d = event.data;
  if (!d || !d.type) return;

  /* Programar notificación con retardo */
  if (d.type === 'SCHEDULE_NOTIFICATION') {
    const delay = Math.max(0, d.delay || 0);
    const tag   = d.tag || 'hos-alert';

    // Cancelar timer anterior con el mismo tag
    if (_notifTimers[tag]) {
      clearTimeout(_notifTimers[tag]);
      delete _notifTimers[tag];
    }

    if (delay === 0) {
      self.registration.showNotification(d.title || 'HOS Tracker', {
        body:    d.body  || '',
        icon:    d.icon  || './icon-192.png',
        badge:   './icon-192.png',
        tag,
        vibrate: [200, 100, 200],
        requireInteraction: tag === 'rest-done',
        data: { url: '/' }
      });
    } else {
      _notifTimers[tag] = setTimeout(() => {
        delete _notifTimers[tag];
        self.registration.showNotification(d.title || 'HOS Tracker', {
          body:    d.body  || '',
          icon:    d.icon  || './icon-192.png',
          badge:   './icon-192.png',
          tag,
          vibrate: [200, 100, 200],
          requireInteraction: tag === 'rest-done',
          data: { url: '/' }
        });
      }, delay);
    }
  }

  /* Alerta HOS inmediata */
  if (d.type === 'HOS_ALERT') {
    self.registration.showNotification('🚛 HOS Tracker', {
      body:    d.body || 'Alerta HOS',
      icon:    './icon-192.png',
      badge:   './icon-192.png',
      tag:     'hos-alert-now',
      vibrate: [300, 100, 300],
      requireInteraction: true,
      data: { url: '/' }
    });
  }

  /* Cancelar todas las notificaciones de descanso */
  if (d.type === 'CANCEL_REST_NOTIFICATIONS') {
    ['rest-1h','rest-30min','rest-10min','rest-done'].forEach(tag => {
      if (_notifTimers[tag]) { clearTimeout(_notifTimers[tag]); delete _notifTimers[tag]; }
    });
  }
});

/* Abrir la app al tocar la notificación */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(url) && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
