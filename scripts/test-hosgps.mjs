#!/usr/bin/env node
/**
 * Pruebas del servicio central de GPS (HOSGps) extraído de index.html,
 * corriendo contra mocks de navigator.geolocation. Cubre: arranque, fix
 * entrante (velocidad y suscriptores), permiso denegado (sin reintentos
 * ni avisos duplicados), rearranque y stop definitivo.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import assert from 'assert';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');

const start = html.indexOf('window.HOSGps = (function ()');
assert.ok(start !== -1, 'No se encontró el módulo HOSGps en index.html');
const end = html.indexOf('})();', start) + 5;
const src = html.slice(start, end);

// ── Mocks del entorno navegador ─────────────────────────────────────
const g = globalThis;
g.window = g;
g.document = { hidden: false, addEventListener: () => {} };
let watchCount = 0, clearCount = 0, currentCb = null, currentErrCb = null;
Object.defineProperty(g, 'navigator', {
  configurable: true,
  value: {
    geolocation: {
      watchPosition: (cb, errCb) => { watchCount++; currentCb = cb; currentErrCb = errCb; return watchCount; },
      clearWatch: () => { clearCount++; }
    },
    permissions: { query: () => Promise.resolve({ state: 'prompt', addEventListener: () => {} }) }
  }
});
g._anchorSpeedMph = () => 42;
const toasts = [];
g.showToast = (...a) => toasts.push(a);
g.lang = 'es';
const _origSetInterval = g.setInterval;
g.setInterval = () => 0; // sin timers vivos en el test

new Function(src)();
g.setInterval = _origSetInterval;
const G = g.window.HOSGps;

// 1) start crea el watch
G.start();
assert.strictEqual(watchCount, 1, 'start() no creó el watch');
assert.strictEqual(G.isRunning(), true, 'isRunning falso tras start()');

// 2) un fix alimenta lastFixFm, velocidad y suscriptores
let subCalls = 0;
G.onFix(() => subCalls++);
currentCb({ coords: { latitude: 25.77, longitude: -80.19, accuracy: 8, speed: 26.8, heading: 90 }, timestamp: Date.now() });
assert.ok(Math.abs(g.window.lastFixFm.lat - 25.77) < 1e-9, 'lastFixFm.lat incorrecto');
assert.strictEqual(g.window._dbgGps.spd, 60, `mph esperado 60, fue ${g.window._dbgGps.spd}`);
assert.strictEqual(subCalls, 1, 'suscriptor onFix no llamado');
assert.ok(G.fixAgeMs() !== null && G.fixAgeMs() < 2000, 'fixAgeMs fuera de rango');

// 3) permiso denegado: limpia watch y avisa UNA sola vez
currentErrCb({ code: 1, message: 'User denied Geolocation' });
assert.ok(clearCount >= 1, 'watch no limpiado tras denegación');
assert.strictEqual(toasts.length, 1, `esperaba 1 toast, hubo ${toasts.length}`);
currentErrCb({ code: 1, message: 'User denied Geolocation' });
assert.strictEqual(toasts.length, 1, 'toast duplicado tras segunda denegación');

// 4) rearranque manual crea un watch nuevo
G.start();
assert.strictEqual(watchCount, 2, 'restart no creó watch nuevo');

// 5) stop apaga de verdad
G.stop();
assert.strictEqual(G.isRunning(), false, 'isRunning verdadero tras stop()');

// 6) un timeout transitorio NO se trata como denegación
G.start();
currentErrCb({ code: 3, message: 'Timeout expired' });
assert.strictEqual(toasts.length, 1, 'toast indebido en timeout');

console.log('✅ HOSGps: 6/6 pruebas pasaron');
