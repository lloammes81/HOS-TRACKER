// SW versión — solo cambia cuando cambia la LÓGICA de este archivo.
const CACHE_VERSION = 'v57-network-first';
const CACHE_NAME = 'truck-precision-' + CACHE_VERSION;

// Caché de tiles del mapa: independiente del ciclo de vida de la app.
// Cache-first porque los tiles son pesados y no cambian entre versiones.
const TILE_CACHE = 'tp-tiles-v1';
const TILE_MAX_ENTRIES = 1500;

// Install: activa inmediatamente sin pre-cachear nada
// (network-first no necesita precaché; el caché se llena en tiempo real).
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n !== CACHE_NAME && n !== TILE_CACHE)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ includeUncontrolled: true, type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED' })))
  );
});

// ── Notificaciones HOS en segundo plano ──────────────────────────
const _hosNotifTimers = new Map();

function _showHosNotification(title, body, tag, icon) {
  return self.registration.showNotification(title || 'Truck Precision', {
    body: body || '',
    icon: icon || './icon-192.png',
    badge: './icon-192.png',
    tag: tag || 'hos-alert',
    renotify: true,
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: tag === 'rest-done',
    data: { url: './' }
  }).catch(() => {});
}

self.addEventListener('message', (event) => {
  const d = event.data || {};

  if (d.type === 'SKIP_WAITING') { self.skipWaiting(); return; }

  if (d.type === 'SCHEDULE_NOTIFICATION') {
    const delay = Math.max(0, d.delay || 0);
    const tag = d.tag || 'hos-alert';
    if (_hosNotifTimers.has(tag)) clearTimeout(_hosNotifTimers.get(tag));
    const id = setTimeout(() => {
      _hosNotifTimers.delete(tag);
      _showHosNotification(d.title, d.body, tag, d.icon);
    }, delay);
    _hosNotifTimers.set(tag, id);
    return;
  }

  if (d.type === 'HOS_ALERT') {
    _showHosNotification(d.title || 'Truck Precision', d.body, d.tag || 'hos-alert', d.icon);
    return;
  }

  if (d.type === 'CANCEL_REST_NOTIFICATIONS') {
    for (const [tag, id] of _hosNotifTimers) {
      if (tag.indexOf('rest-') === 0) { clearTimeout(id); _hosNotifTimers.delete(tag); }
    }
    self.registration.getNotifications().then((list) => {
      list.forEach((n) => { if (n.tag && n.tag.indexOf('rest-') === 0) n.close(); });
    }).catch(() => {});
    return;
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { body: event.data && event.data.text() }; }
  event.waitUntil(_showHosNotification(data.title, data.body, data.tag, data.icon));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // ── Tiles del mapa (TomTom) → CACHE-FIRST ─────────────────────────
  // Único recurso que sigue siendo cache-first: son pesados, no cambian,
  // y son críticos para usar el mapa sin señal en carretera.
  if (req.url.includes('api.tomtom.com/map/') && req.url.includes('/tile')) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            if (res && (res.status === 200 || res.type === 'opaque')) {
              cache.put(req, res.clone()).then(() => trimTileCache(cache)).catch(() => {});
            }
            return res;
          });
        })
      ).catch(() => fetch(req))
    );
    return;
  }

  // ── Todo lo demás → NETWORK-FIRST ─────────────────────────────────
  // Con señal: siempre descarga la versión más nueva y actualiza el caché.
  // Sin señal: usa lo que haya en caché como respaldo offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) =>
          cached ||
          (req.mode === 'navigate'
            ? caches.match('./index.html').then(
                (r) => r || new Response('<h1>Offline - Truck Precision</h1>', {
                  status: 503,
                  headers: { 'Content-Type': 'text/html' }
                })
              )
            : undefined)
        )
      )
  );
});

let _tileTrimCounter = 0;
async function trimTileCache(cache) {
  if (++_tileTrimCounter % 20 !== 0) return;
  try {
    const keys = await cache.keys();
    if (keys.length <= TILE_MAX_ENTRIES) return;
    const excess = keys.length - TILE_MAX_ENTRIES;
    await Promise.all(keys.slice(0, excess).map((k) => cache.delete(k)));
  } catch (e) {}
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'gps-sync') {
    event.waitUntil(syncGPSData());
  }
});

async function syncGPSData() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => client.postMessage({ type: 'SYNC_GPS' }));
}
