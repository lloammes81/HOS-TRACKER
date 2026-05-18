const CACHE_NAME = 'truck-precision-v185';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    ).then(() => {
      self.clients.claim();
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request, { cache: 'reload' }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});

const _notifTimers = {};

self.addEventListener('message', event => {
  const d = event.data;
  if (!d || !d.type) return;
  if (d.type === 'SCHEDULE_NOTIFICATION') {
    const delay = Math.max(0, d.delay || 0);
    const tag = d.tag || 'hos-alert';
    if (_notifTimers[tag]) { clearTimeout(_notifTimers[tag]); delete _notifTimers[tag]; }
    if (delay === 0) {
      self.registration.showNotification(d.title || 'HOS Tracker', { body: d.body || '', icon: d.icon || './icon-192.png', badge: './icon-192.png', tag, vibrate: [200, 100, 200], requireInteraction: tag === 'rest-done', data: { url: '/' } });
    } else {
      _notifTimers[tag] = setTimeout(() => {
        delete _notifTimers[tag];
        self.registration.showNotification(d.title || 'HOS Tracker', { body: d.body || '', icon: d.icon || './icon-192.png', badge: './icon-192.png', tag, vibrate: [200, 100, 200], requireInteraction: tag === 'rest-done', data: { url: '/' } });
      }, delay);
    }
  }
  if (d.type === 'HOS_ALERT') {
    self.registration.showNotification('🚛 HOS Tracker', { body: d.body || 'Alerta HOS', icon: './icon-192.png', badge: './icon-192.png', tag: 'hos-alert-now', vibrate: [300, 100, 300], requireInteraction: true, data: { url: '/' } });
  }
  if (d.type === 'CANCEL_REST_NOTIFICATIONS') {
    ['rest-1h','rest-30min','rest-10min','rest-done'].forEach(tag => {
      if (_notifTimers[tag]) { clearTimeout(_notifTimers[tag]); delete _notifTimers[tag]; }
    });
  }
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) {}
  const title = data.title || '🚛 HOS Tracker';
  const opts = { body: data.body || 'Nueva notificación', icon: data.icon || './icon-192.png', badge: './icon-192.png', tag: data.tag || 'hos-push', vibrate: [200, 100, 200], requireInteraction: data.requireInteraction || false, data: { url: data.url || '/' } };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('periodicsync', event => {
  if (event.tag === 'hos-news-check') {
    event.waitUntil(self.registration.showNotification('🚛 HOS Tracker — Noticias DOT', { body: 'Hay actualizaciones disponibles.', icon: './icon-192.png', badge: './icon-192.png', tag: 'hos-periodic-news', vibrate: [150, 60, 150], data: { url: '/' } }));
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    const existing = clients.find(c => c.url.includes(url) && 'focus' in c);
    if (existing) return existing.focus();
    return self.clients.openWindow(url);
  }));
});
