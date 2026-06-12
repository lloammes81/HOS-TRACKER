// Verifica que los archivos servidos desde www/ (GitHub Pages) sean idénticos
// a los de la raíz del repo. Si esto falla, alguien editó la raíz y olvidó
// copiar a www/ (o al revés) — y producción quedaría desactualizada.
import { readFileSync, existsSync } from 'node:fs';

const FILES = [
  'index.html',
  'dashboard.html',
  'manifest.json',
  'sw.js',
  'hardware-permissions.js',
  'icon.png',
  'logo.png',
  'dash.png',
  'trasparente.ico',
  'icon-32.png',
  'icon-96.png',
  'icon-144.png',
  'icon-192.png',
  'icon-512.png',
  'apple-touch-icon.png'
];

let failed = false;
for (const f of FILES) {
  const rootPath = new URL(`../${f}`, import.meta.url);
  const wwwPath  = new URL(`../www/${f}`, import.meta.url);
  if (!existsSync(rootPath) || !existsSync(wwwPath)) {
    console.error(`❌ ${f}: falta en ${existsSync(rootPath) ? 'www/' : 'la raíz'}`);
    failed = true;
    continue;
  }
  const a = readFileSync(rootPath);
  const b = readFileSync(wwwPath);
  if (!a.equals(b)) {
    console.error(`❌ ${f}: la copia de www/ difiere de la raíz (ejecuta la parte de 'cp' de npm run build)`);
    failed = true;
  } else {
    console.log(`✅ ${f} (raíz ≡ www)`);
  }
}

if (failed) process.exit(1);
console.log('\nParidad raíz ↔ www OK');
