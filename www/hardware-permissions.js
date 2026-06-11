
// ════════════════════════════════════════════════════════════
// 📱 HARDWARE PERMISSIONS MANAGER
// ════════════════════════════════════════════════════════════

// Adaptador: la app define showToast(type, icon, title, msg).
// Usamos un nombre propio (hwToast) para NO sobrescribir la showToast
// global de la app, y traducimos la firma (mensaje, nivel).
function hwToast(message, level) {
  level = level || 'info';
  const map = {
    success: { type: 'success', icon: '✅', title: 'Hardware' },
    error:   { type: 'danger',  icon: '❌', title: 'Hardware' },
    warning: { type: 'warning', icon: '⚠️', title: 'Hardware' },
    info:    { type: 'info',    icon: 'ℹ️', title: 'Hardware' }
  };
  const m = map[level] || map.info;
  if (typeof showToast === 'function') {
    showToast(m.type, m.icon, m.title, message);
  } else {
    console.log('[Hardware] ' + level + ': ' + message);
  }
}

const HardwareManager = {
  // GPS / Geolocation
  async requestGPS() {
    if (!navigator.geolocation) {
      hwToast('GPS no soportado en este dispositivo', 'error');
      return false;
    }
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });
      hwToast('✅ GPS activo', 'success');
      return position;
    } catch (err) {
      hwToast('❌ GPS: ' + err.message, 'error');
      return false;
    }
  },

  // Bluetooth
  async requestBluetooth() {
    if (!navigator.bluetooth) {
      hwToast('Bluetooth no disponible. Usa Chrome/Android', 'warning');
      return false;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information']
      });
      hwToast('✅ Bluetooth: ' + device.name, 'success');
      return device;
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        hwToast('❌ Bluetooth: ' + err.message, 'error');
      }
      return false;
    }
  },

  // Camera
  async requestCamera(videoElement) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      hwToast('Cámara no soportada', 'error');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
      }
      hwToast('✅ Cámara activa', 'success');
      return stream;
    } catch (err) {
      hwToast('❌ Cámara: ' + err.message, 'error');
      return false;
    }
  },

  // Microphone (para ELD voice commands)
  async requestMicrophone() {
    if (!navigator.mediaDevices) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      hwToast('✅ Micrófono activo', 'success');
      return stream;
    } catch (err) {
      hwToast('❌ Micrófono: ' + err.message, 'error');
      return false;
    }
  },

  // Notifications
  async requestNotifications() {
    if (!('Notification' in window)) {
      hwToast('Notificaciones no soportadas', 'warning');
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      hwToast('✅ Notificaciones activas', 'success');
      return true;
    }
    hwToast('❌ Notificaciones denegadas', 'warning');
    return false;
  },

  // Sensors (accelerometer, gyroscope)
  async requestSensors() {
    if ('Accelerometer' in window) {
      try {
        const accel = new Accelerometer({ frequency: 60 });
        accel.start();
        return accel;
      } catch (err) {
        console.log('Accelerometer error:', err);
      }
    }
    return false;
  },

  // Request all permissions at once
  async requestAll() {
    hwToast('Solicitando permisos de hardware...', 'info');
    await this.requestGPS();
    await this.requestNotifications();
    // Bluetooth y cámara se solicitan on-demand por seguridad
  }
};

// Nota: ya NO se auto-solicita el GPS aquí. El servicio central HOSGps
// (index.html) arranca su propio watchPosition al cargar y gestiona el
// permiso; pedirlo también desde aquí duplicaba la solicitud y mostraba
// un toast de GPS sin que el usuario hubiera tocado nada.

// Make globally available
window.HardwareManager = HardwareManager;
