#!/usr/bin/env node
/**
 * Patches ios/App/App/Info.plist with required permission descriptions.
 * Cross-platform: uses pure Node.js fs (no PlistBuddy / macOS dependency).
 */

const fs   = require('fs');
const path = require('path');

const PLIST = path.join(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');

const permissions = [
  ['NSCameraUsageDescription',
   'Necesario para escanear documentos y tomar fotos en tus registros de viaje.'],
  ['NSLocationWhenInUseUsageDescription',
   'Necesario para el rastreo GPS en tiempo real y la navegación de rutas.'],
  ['NSLocationAlwaysAndWhenInUseUsageDescription',
   'Necesario para el rastreo GPS en segundo plano durante los turnos de manejo.'],
  ['NSLocationAlwaysUsageDescription',
   'Necesario para el rastreo GPS en segundo plano durante los turnos de manejo.'],
  ['NSBluetoothAlwaysUsageDescription',
   'Necesario para conectar dispositivos ELD y monitorear datos de horas de servicio.'],
  ['NSBluetoothPeripheralUsageDescription',
   'Necesario para conectar dispositivos ELD para el cumplimiento de HOS.'],
  ['NSMicrophoneUsageDescription',
   'Necesario para grabación de notas de voz en los registros de manejo.'],
  ['NSPhotoLibraryUsageDescription',
   'Necesario para guardar y acceder a fotos de documentos de carga.'],
  ['NSPhotoLibraryAddUsageDescription',
   'Necesario para guardar fotos de documentos en tu galería.'],
  ['NSMotionUsageDescription',
   'Usado para detectar actividad de manejo automáticamente.'],
  ['NSUserNotificationsUsageDescription',
   'Necesario para alertas de horas de servicio, límites de manejo y recordatorios de descanso.'],
];

if (!fs.existsSync(PLIST)) {
  console.warn('⚠️  Info.plist not found — skipping iOS permissions patch.');
  console.warn(`   Expected at: ${PLIST}`);
  process.exit(0);
}

let xml = fs.readFileSync(PLIST, 'utf8');
let patched = 0;

for (const [key, value] of permissions) {
  const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Check if key already exists
  const existingRe = new RegExp(
    `(<key>${key}<\\/key>\\s*<string>)[^<]*(</string>)`, 's'
  );

  if (existingRe.test(xml)) {
    // Update existing value
    xml = xml.replace(existingRe, `$1${escaped}$2`);
    console.log(`🔄 Updated: ${key}`);
  } else {
    // Insert before closing </dict> of the root dict
    const insertBlock = `\t<key>${key}</key>\n\t<string>${escaped}</string>\n`;
    xml = xml.replace(/(<\/dict>\s*<\/plist>)/, `${insertBlock}$1`);
    console.log(`✅ Added: ${key}`);
  }
  patched++;
}

fs.writeFileSync(PLIST, xml, 'utf8');
console.log(`\n✅ iOS permissions patched: ${patched} added/updated.`);
