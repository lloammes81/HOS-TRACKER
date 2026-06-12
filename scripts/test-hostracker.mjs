#!/usr/bin/env node
/**
 * Pruebas del tracker de horas de servicio (_hosTracker) extraído de
 * index.html, con reloj simulado y mocks de DOM/localStorage. Cubre:
 * inicialización de horas restantes, descuento por conducción (regla de
 * 11h diarias y ciclo de 70h), tope en cero, cierre de sesión al parar,
 * persistencia y reinicio diario de las horas de manejo.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import assert from 'assert';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(root, 'index.html'), 'utf8');

const marker = html.indexOf('/* ── HOS Tracker');
assert.ok(marker !== -1, 'No se encontró el módulo HOS Tracker en index.html');
const start = html.indexOf('(function(){', marker);
const anchor = html.indexOf('window._hosTracker', start);
assert.ok(anchor !== -1, 'No se encontró window._hosTracker');
const end = html.indexOf('})();', anchor) + 5;
const src = html.slice(start, end);

// ── Mocks del entorno navegador ─────────────────────────────────────
const g = globalThis;
g.window = g;
const store = new Map();
g.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};
g.document = { getElementById: () => null, addEventListener: () => {} };
Object.defineProperty(g, 'navigator', { configurable: true, value: {} });
const _origSetInterval = g.setInterval, _origSetTimeout = g.setTimeout;
g.setInterval = () => 0; // sin timers vivos en el test
g.setTimeout = () => 0;

// ── Reloj simulado ──────────────────────────────────────────────────
const RealDate = Date;
let fakeNow = new RealDate('2026-06-12T08:00:00').getTime();
class FakeDate extends RealDate {
  constructor(...args) { args.length ? super(...args) : super(fakeNow); }
  static now() { return fakeNow; }
}
g.Date = FakeDate;
const advance = ms => { fakeNow += ms; };
const H = 3600000;

function bootModule() {
  new Function(src)();
  return g.window._hosTracker;
}

let T = bootModule();

// 1) setInitialHours fija las horas restantes tal cual
T.setInitialHours(11, 70);
assert.ok(Math.abs(T.driveLeft() - 11) < 1e-9, `driveLeft esperado 11, fue ${T.driveLeft()}`);
assert.ok(Math.abs(T.cycleLeft() - 70) < 1e-9, `cycleLeft esperado 70, fue ${T.cycleLeft()}`);
T.setInitialHours(5.5, 33);
assert.ok(Math.abs(T.driveLeft() - 5.5) < 1e-9, 'driveLeft no respeta horas parciales');
assert.ok(Math.abs(T.cycleLeft() - 33) < 1e-9, 'cycleLeft no respeta horas parciales');

// 2) conducir 1h descuenta de las 11h diarias y del ciclo 70h
T.reportMoving(true, 60);
advance(1 * H);
assert.ok(Math.abs(T.driveLeft() - 4.5) < 0.01, `tras 1h esperaba 4.5, fue ${T.driveLeft()}`);
assert.ok(Math.abs(T.cycleLeft() - 32) < 0.01, `tras 1h esperaba 32, fue ${T.cycleLeft()}`);

// 3) las horas disponibles nunca bajan de 0 (regla de 11h)
advance(10 * H);
assert.strictEqual(T.driveLeft(), 0, 'driveLeft debe quedar en 0, no negativo');
assert.ok(Math.abs(T.cycleLeft() - 22) < 0.01, `ciclo tras 11h esperaba 22, fue ${T.cycleLeft()}`);

// 4) al parar se cierra la sesión y el tiempo detenido no descuenta
T.reportMoving(true, 60); // refresca _lastMovingTs en el reloj simulado
advance(6000);            // supera la ventana anti-ruido de 5s
T.reportMoving(false, 0);
const dlStopped = T.driveLeft(), clStopped = T.cycleLeft();
advance(2 * H);
assert.strictEqual(T.driveLeft(), dlStopped, 'driveLeft cambió estando detenido');
assert.strictEqual(T.cycleLeft(), clStopped, 'cycleLeft cambió estando detenido');

// 5) persistencia: una instancia nueva el mismo día conserva las horas
T = bootModule();
assert.ok(Math.abs(T.driveLeft() - 0) < 0.01, 'driveLeft no persistió tras recargar');
assert.ok(Math.abs(T.cycleLeft() - clStopped) < 0.01, 'cycleLeft no persistió tras recargar');

// 6) al día siguiente las 11h diarias se reinician pero el ciclo 70h continúa
advance(24 * H); // 13/jun: cambió el día calendario
T = bootModule();
assert.ok(Math.abs(T.driveLeft() - 11) < 1e-9, `nuevo día: driveLeft esperado 11, fue ${T.driveLeft()}`);
assert.ok(Math.abs(T.cycleLeft() - clStopped) < 0.01, 'nuevo día: el ciclo 70h no debe reiniciarse');

g.setInterval = _origSetInterval;
g.setTimeout = _origSetTimeout;
g.Date = RealDate;

console.log('✅ HOS Tracker: 6/6 pruebas pasaron');
