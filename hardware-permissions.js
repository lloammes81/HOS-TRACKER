
// ════════════════════════════════════════════════════════════
// 📱 HARDWARE PERMISSIONS MANAGER
// ════════════════════════════════════════════════════════════

const HardwareManager = {
  // GPS / Geolocation
  async requestGPS() {
    if (!navigator.geolocation) {
      showToast('GPS no soportado en este dispositivo', 'error');
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
      showToast('✅ GPS activo', 'success');
      return position;
    } catch (err) {
      showToast('❌ GPS: ' + err.message, 'error');
      return false;
    }
  },

  // Bluetooth
  async requestBluetooth() {
    if (!navigator.bluetooth) {
      showToast('Bluetooth no disponible. Usa Chrome/Android', 'warning');
      return false;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information']
      });
      showToast('✅ Bluetooth: ' + device.name, 'success');
      return device;
    } catch (err) {
      if (err.name !== 'NotFoundError') {
        showToast('❌ Bluetooth: ' + err.message, 'error');
      }
      return false;
    }
  },

  // Camera
  async requestCamera(videoElement) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Cámara no soportada', 'error');
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
      showToast('✅ Cámara activa', 'success');
      return stream;
    } catch (err) {
      showToast('❌ Cámara: ' + err.message, 'error');
      return false;
    }
  },

  // Microphone (para ELD voice commands)
  async requestMicrophone() {
    if (!navigator.mediaDevices) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      showToast('✅ Micrófono activo', 'success');
      return stream;
    } catch (err) {
      showToast('❌ Micrófono: ' + err.message, 'error');
      return false;
    }
  },

  // Notifications
  async requestNotifications() {
    if (!('Notification' in window)) {
      showToast('Notificaciones no soportadas', 'warning');
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('✅ Notificaciones activas', 'success');
      return true;
    }
    showToast('❌ Notificaciones denegadas', 'warning');
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
    showToast('Solicitando permisos de hardware...', 'info');
    await this.requestGPS();
    await this.requestNotifications();
    // Bluetooth y cámara se solicitan on-demand por seguridad
  }
};

// Auto-request GPS on app start
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => HardwareManager.requestGPS(), 1000);
});

// Make globally available
window.HardwareManager = HardwareManager;
