#!/usr/bin/env node
/**
 * Chequeo de sintaxis del proyecto:
 * - Extrae los <script> inline de index.html y dashboard.html y los valida
 *   con `node --check` (clásicos) / `--input-type=module` (módulos ES).
 * - Valida que los JSON del proyecto parseen.
 * Sale con código != 0 si algo falla (pensado para CI).
 */
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;

function checkJs(source, label, isModule) {
  try {
    const args = isModule ? ['--input-type=module', '--check'] : ['--check'];
    execFileSync(process.execPath, args, { input: source, stdio: ['pipe', 'pipe', 'pipe'] });
    console.log(`✅ ${label}`);
  } catch (e) {
    failures++;
    console.error(`❌ ${label}\n${(e.stderr || '').toString().slice(0, 1200)}`);
  }
}

for (const file of ['index.html', 'dashboard.html']) {
  const html = readFileSync(path.join(root, file), 'utf8');
  const all = [...html.matchAll(/<script(?![^>]*src=)([^>]*)>([\s\S]*?)<\/script>/gi)];
  const classics = [];
  let modCount = 0;
  for (const [, attrs, body] of all) {
    if (!body.trim()) continue;
    if (/type\s*=\s*["']module["']/i.test(attrs)) {
      modCount++;
      checkJs(body, `${file} módulo #${modCount}`, true);
    } else {
      classics.push(body);
    }
  }
  // Los clásicos comparten el ámbito global: se validan concatenados
  if (classics.length) checkJs(classics.join('\n;\n'), `${file} (${classics.length} scripts clásicos)`, false);
}

for (const file of ['sw.js', 'hardware-permissions.js']) {
  checkJs(readFileSync(path.join(root, file), 'utf8'), file, false);
}

for (const file of ['manifest.json', 'package.json', 'database.rules.json', 'capacitor.config.json', 'ionic.config.json']) {
  try {
    JSON.parse(readFileSync(path.join(root, file), 'utf8'));
    console.log(`✅ ${file}`);
  } catch (e) {
    failures++;
    console.error(`❌ ${file}: ${e.message}`);
  }
}

if (failures) { console.error(`\n${failures} archivo(s) con errores`); process.exit(1); }
console.log('\nTodo OK');
