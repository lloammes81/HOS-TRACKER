#!/usr/bin/env node
/**
 * Patches ios/App/App/Info.plist with required permission descriptions.
 * Runs after `npx cap add ios` in the AppFlow build script.
 */

const { execSync } = require('child_process');
const path = require('path');

const PLIST = path.join(__dirname, '..', 'ios', 'App', 'App', 'Info.plist');
const PB = '/usr/libexec/PlistBuddy';

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

let patched = 0;
let skipped = 0;

for (const [key, value] of permissions) {
  try {
    // Try to add; if key exists PlistBuddy exits with error — catch and skip
    execSync(`${PB} -c "Add :${key} string '${value}'" "${PLIST}"`, { stdio: 'pipe' });
    console.log(`✅ Added: ${key}`);
    patched++;
  } catch {
    try {
      // Key already exists — overwrite it
      execSync(`${PB} -c "Set :${key} '${value}'" "${PLIST}"`, { stdio: 'pipe' });
      console.log(`🔄 Updated: ${key}`);
      patched++;
    } catch (e2) {
      console.warn(`⚠️  Skipped: ${key} — ${e2.message}`);
      skipped++;
    }
  }
}

console.log(`\n✅ iOS permissions patched: ${patched} added/updated, ${skipped} skipped.`);
