/* ═══════════════════════════════════════════════════
   HOS Tracker — Service Worker
   Maneja notificaciones push aunque la app esté cerrada
═══════════════════════════════════════════════════ */

const SW_VERSION = 'hos-sw-v1';

// ── Instalar SW ─────────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// ── Recibir Push del servidor ────────────────────────
self.addEventListener('push', e => {
  let data = { title: 'HOS Tracker', body: 'Tienes una alerta de horas de servicio.', icon: '/HOS_Tracker_Version1.png', badge: '/HOS_Tracker_Version1.png' };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch(err) {
    if (e.data) data.body = e.data.text();
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon   || '/HOS_Tracker_Version1.png',
      badge:   data.badge  || '/HOS_Tracker_Version1.png',
      tag:     data.tag    || 'hos-alert',
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/', ...data },
      actions: data.actions || [
        { action: 'open',    title: '📋 Ver detalles' },
        { action: 'dismiss', title: '✕ Cerrar'        }
      ]
    })
  );
});

// ── Al tocar la notificación ─────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'dismiss') return;

  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Si hay una ventana abierta, enfocarla
      for (const client of clients) {
        if ('focus' in client) { client.focus(); return; }
      }
      // Si no hay ventana, abrir una nueva
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// ── Notificaciones locales programadas ──────────────
// Recibe mensajes de la app principal para programar alertas
self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body, tag, icon } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title || 'HOS Tracker', {
        body:    body   || 'Alerta de horas de servicio',
        icon:    icon   || '/HOS_Tracker_Version1.png',
        badge:   '/HOS_Tracker_Version1.png',
        tag:     tag    || 'hos-scheduled',
        vibrate: [200, 100, 200],
        data:    { url: '/' },
        actions: [
          { action: 'open',    title: '📋 Ver detalles' },
          { action: 'dismiss', title: '✕ Cerrar'        }
        ]
      });
    }, delay || 0);
  }

  if (e.data.type === 'HOS_ALERT') {
    // Alerta inmediata de horas de conducción
    self.registration.showNotification('⚠️ HOS Tracker — Alerta de Horas', {
      body:    e.data.body || 'Revisa tus horas de servicio.',
      icon:    '/HOS_Tracker_Version1.png',
      badge:   '/HOS_Tracker_Version1.png',
      tag:     'hos-hours-alert',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      data:    { url: '/' },
      actions: [
        { action: 'open',    title: '📋 Ver HOS' },
        { action: 'dismiss', title: '✕ Cerrar'   }
      ]
    });
  }
});

// ── Sync en background ───────────────────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'hos-check')  e.waitUntil(checkHOSAlerts());
  if (e.tag === 'trial-check') e.waitUntil(checkTrialNotification());
});

async function checkTrialNotification() {
  try {
    const raw = self._trialData || null;
    // Leer de IndexedDB (guardado por la app)
    const cache = await caches.open('hos-data-v1');
    const resp  = await cache.match('trial-state');
    if (!resp) return;
    const trial = await resp.json();

    if (!trial || trial.status !== 'trial') return;

    const daysElapsed = (Date.now() - trial.trialStart) / (1000 * 60 * 60 * 24);
    const daysLeft    = Math.ceil(trial.trialDays - daysElapsed);

    if (daysLeft <= 0 || daysLeft > trial.trialDays) return;

    // Solo notificar una vez por día
    const todayKey = new Date().toDateString();
    const notifResp = await cache.match('trial-notif-date');
    if (notifResp) {
      const lastDate = await notifResp.text();
      if (lastDate === todayKey) return;
    }
    await cache.put('trial-notif-date', new Response(todayKey));

    let title, body;
    if (daysLeft === 1) {
      title = '⚠️ HOS Tracker — ¡Último día gratis!';
      body  = 'Tu prueba gratuita termina HOY. Suscríbete para no perder el acceso.';
    } else if (daysLeft <= 3) {
      title = `⏰ HOS Tracker — ${daysLeft} días gratis restantes`;
      body  = `Solo te quedan ${daysLeft} días de prueba gratuita. ¡No pierdas el acceso!`;
    } else {
      title = `🚛 HOS Tracker — ${daysLeft} días de prueba restantes`;
      body  = `Llevas ${Math.floor(daysElapsed)} días de tu prueba de 7 días. Te quedan ${daysLeft} días.`;
    }

    await self.registration.showNotification(title, {
      body,
      icon:    '/HOS_Tracker_Version1.png',
      badge:   '/HOS_Tracker_Version1.png',
      tag:     'hos-trial-reminder',
      vibrate: [200, 100, 200],
      requireInteraction: daysLeft === 1,
      data:    { url: '/' },
      actions: [
        { action: 'open',    title: '📋 Suscribirme' },
        { action: 'dismiss', title: '✕ Cerrar'        }
      ]
    });
  } catch(e) {}
}

async function checkHOSAlerts() {
  // Leer datos de HOS del cache/IndexedDB
  try {
    const cache = await caches.open('hos-data-v1');
    const resp  = await cache.match('hos-state');
    if (!resp) return;
    const state = await resp.json();

    const driveLeft = state.driveHoursLeft;
    const dutyLeft  = state.dutyHoursLeft;

    if (driveLeft !== undefined && driveLeft <= 1 && driveLeft > 0) {
      await self.registration.showNotification('⚠️ HOS Tracker — 1 hora de manejo', {
        body:    `Solo te quedan ${driveLeft.toFixed(1)} horas de manejo. Busca un lugar para parar.`,
        icon:    '/HOS_Tracker_Version1.png',
        badge:   '/HOS_Tracker_Version1.png',
        tag:     'hos-drive-warning',
        vibrate: [300, 100, 300],
        requireInteraction: true,
        data:    { url: '/' }
      });
    }

    if (dutyLeft !== undefined && dutyLeft <= 1 && dutyLeft > 0) {
      await self.registration.showNotification('⚠️ HOS Tracker — Turno terminando', {
        body:    `Solo te quedan ${dutyLeft.toFixed(1)} horas en turno.`,
        icon:    '/HOS_Tracker_Version1.png',
        badge:   '/HOS_Tracker_Version1.png',
        tag:     'hos-duty-warning',
        vibrate: [300, 100, 300],
        requireInteraction: true,
        data:    { url: '/' }
      });
    }
  } catch(err) {}
}
