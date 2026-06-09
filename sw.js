// ⚠️ Al cambiar la lógica de la app, sube el número de versión del caché.
// Esto fuerza al navegador a instalar un nuevo Service Worker y purgar el viejo.
const CACHE_VERSION = 'v10-dash-ring-fix';
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

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ includeUncontrolled: true, type: 'window' }))
      .then((clients) => clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED' })))
  );
});

// Permite forzar la activación inmediata desde la página si hiciera falta.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
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
