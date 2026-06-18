// ⚠️ Al cambiar la lógica de la app, sube el número de versión del caché.
// Esto fuerza al navegador a instalar un nuevo Service Worker y purgar el viejo.
const CACHE_VERSION = 'v46-bell-btn';
const CACHE_NAME = 'truck-precision-' + CACHE_VERSION;

// Recursos base (se cachean en install; los errores se ignoran para no romper la instalación).
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800;900&family=Share+Tech+Mono&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      .then(() => self.skipWaiting())
  );
});

// Caché de tiles del mapa: sobrevive a los cambios de versión de la app
// (los tiles no cambian con cada release y son lo más caro de re-descargar).
const TILE_CACHE = 'tp-tiles-v1';
const TILE_MAX_ENTRIES = 1500; // ~40-60 MB máx; se recortan los más viejos

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME && n !== TILE_CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ includeUncontrolled: true, type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED' })))
  );
});

// ── Notificaciones HOS en segundo plano ──────────────────────────
// La página programa avisos vía postMessage; el SW los muestra aunque la
// pestaña no esté en foco. setTimeout en el SW no es 100% fiable si el SO
// descarga el worker (en nativo @capacitor/local-notifications es el camino
// persistente), pero cubre el caso PWA con la app en segundo plano.
const _hosNotifTimers = new Map(); // tag → timeoutId

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

  // Activación inmediata desde la página si hiciera falta.
  if (d.type === 'SKIP_WAITING') { self.skipWaiting(); return; }

  // Programar una notificación tras `delay` ms (avisos de descanso, etc.)
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

  // Alerta HOS inmediata
  if (d.type === 'HOS_ALERT') {
    _showHosNotification(d.title || 'Truck Precision', d.body, d.tag || 'hos-alert', d.icon);
    return;
  }

  // Cancelar todos los avisos de descanso programados y los ya mostrados
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

// Al tocar una notificación: enfocar la app si está abierta, o abrirla.
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

// Push remoto (si en el futuro se envían desde un servidor): mostrar el payload.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { body: event.data && event.data.text() }; }
  event.waitUntil(_showHosNotification(data.title, data.body, data.tag, data.icon));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isDocument =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    (req.headers.get('accept') || '').includes('text/html');

  // ── HTML / navegación → NETWORK-FIRST ─────────────────────────────
  // Siempre intenta traer la última versión; si no hay red, usa el caché.
  // (Antes era cache-first y dejaba a los usuarios atascados en una
  //  versión vieja de index.html indefinidamente.)
  if (isDocument) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (r) =>
              r ||
              caches.match('./index.html') ||
              new Response('<h1>Offline - Truck Precision</h1>', {
                status: 503,
                headers: { 'Content-Type': 'text/html' }
              })
          )
        )
    );
    return;
  }

  // ── Tiles del mapa base (TomTom) → CACHE-FIRST con tope ───────────
  // Sin señal (común en carretera) el mapa muestra las zonas ya visitadas
  // en vez de quedar gris. El tráfico NO se cachea (es en tiempo real).
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

  // ── Estáticos (CSS/JS/fuentes/imágenes) → CACHE-FIRST con relleno ──
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => undefined);
    })
  );
});

// Recorta el caché de tiles eliminando los más antiguos (FIFO aproximado:
// cache.keys() conserva el orden de inserción). Corre ~1 de cada 20 puts.
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

// Background sync for GPS data
self.addEventListener('sync', (event) => {
  if (event.tag === 'gps-sync') {
    event.waitUntil(syncGPSData());
  }
});

async function syncGPSData() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => client.postMessage({ type: 'SYNC_GPS' }));
}
