# ⏱️ HOS Tracker

**Smart Route Planning for Truckers**

---

## 📱 Sobre la App

**HOS Tracker** es una aplicación web progresiva (PWA) diseñada específicamente para conductores de camiones que necesitan cumplir con las regulaciones DOT de Hours of Service.

### 🎯 Características Principales

- ✅ **Cálculo de rutas** con regulaciones DOT completas
- ✅ **GPS en tiempo real** - Seguimiento de ubicación actual
- ✅ **Ciclo de 70 horas en 8 días** - Tracking completo
- ✅ **Resets automáticos de 34 horas** - Cumplimiento total
- ✅ **100+ ciudades de USA** - Base de datos completa
- ✅ **Funciona offline** - No necesitas conexión constante
- ✅ **Instalable en iPhone** - Como app nativa

---

## 🎨 Branding

### Nombre
**HOS Tracker**
- HOS = Hours of Service
- Tracker = Rastreador/Seguimiento

### Tagline
*"Smart Route Planning for Truckers"*

### Colores de Marca
- **Azul Oscuro**: `#1e3a8a` (Profesional, confiable)
- **Azul Brillante**: `#3b82f6` (Moderno, tecnológico)
- **Verde Éxito**: `#10b981` (Cumplimiento)
- **Naranja**: `#f59e0b` (Atención, alertas)

### Ícono
- Reloj grande (símbolo de HOS - Hours of Service)
- Números 12, 3, 6, 9 en posiciones cardinales
- Manecillas apuntando a las 11 (referencia a las 11 horas de manejo)
- Badge "DOT" en verde
- Camión pequeño en la esquina
- Fondo con gradiente azul profesional

---

## 📦 Archivos del Proyecto

```
hos-tracker/
├── index.html          # Aplicación principal
├── icon.svg           # Ícono de la app
├── manifest.json      # Configuración PWA
├── sw.js             # Service Worker (offline)
└── README.md         # Este archivo
```

---

## 🚀 Instalación en iPhone

### Método 1: Hosting Web (Recomendado)

1. **Sube los archivos a un servidor:**
   - GitHub Pages (gratis)
   - Netlify (gratis)
   - Vercel (gratis)

2. **Desde Safari en tu iPhone:**
   - Abre la URL de tu app
   - Toca el botón **Compartir** 📤
   - Selecciona **"Agregar a pantalla de inicio"**
   - Toca **"Agregar"**

3. **¡Listo!** El ícono aparecerá en tu pantalla de inicio

### Método 2: Uso Directo

1. Abre `index.html` en Safari
2. Funciona inmediatamente (sin instalación)

---

## 🛠️ Regulaciones DOT Implementadas

### ✅ Regulación de 11 Horas
- Máximo 11 horas de manejo por día

### ✅ Descanso de 10 Horas
- 10 horas consecutivas de descanso obligatorio

### ✅ Ciclo de 70 Horas
- 70 horas de manejo máximo en 8 días consecutivos

### ✅ Reset de 34 Horas
- 34 horas consecutivas de descanso para recuperar las 70 horas

---

## 📍 Características GPS

### Tracking en Tiempo Real
- 📍 Ubicación actual (ciudad y estado)
- 🎯 Destino programado
- 📏 Distancia restante en millas
- ⏱️ Horas de manejo restantes

### Actualización Automática
- Cada 10 segundos cuando la ventana GPS está abierta
- Funciona en segundo plano

---

## 🗺️ Ciudades Disponibles

La app incluye más de 100 ciudades principales de USA, con énfasis en:

**Florida:**
- Miami, Orlando, Tampa, Jacksonville
- West Palm Beach, Palm Beach, Boca Raton
- Fort Lauderdale, Fort Myers, Naples
- Y muchas más...

**Otras ciudades principales:**
- New York, Los Angeles, Chicago, Houston
- Dallas, Phoenix, Philadelphia, San Antonio
- San Diego, San Jose, Austin, Seattle
- Y más de 80 ciudades adicionales...

---

## 💡 Cómo Usar

1. **Selecciona Origen y Destino**
   - Escribe el nombre de la ciudad
   - Aparecerán sugerencias automáticas
   - Click en la ciudad deseada

2. **Configura tu Viaje**
   - Fecha y hora de salida
   - Horas restantes en tu ciclo de 70 hrs
   - Velocidad promedio (30-70 mph)

3. **Calcula la Ruta**
   - Click en "🚛 Calcular Ruta"
   - Ve el itinerario completo día por día
   - Detecta automáticamente resets necesarios

4. **Activa el GPS** (opcional)
   - Click en "📍 Ver Mi Ubicación GPS"
   - Permite acceso a ubicación
   - Ventana flotante mostrará tu progreso

---

## 🔒 Privacidad

- ✅ Todos los datos se procesan localmente
- ✅ No se envía información a servidores
- ✅ GPS solo se usa cuando lo activas
- ✅ Funciona 100% offline después de la primera carga

---

## 🆘 Soporte

### Problemas Comunes

**"No aparecen las sugerencias de ciudades"**
- Escribe al menos 2 letras
- Verifica que estés escribiendo en el campo correcto

**"No funciona el GPS"**
- Permite acceso a ubicación cuando Safari lo pida
- Verifica que tengas GPS activo en tu iPhone

**"No puedo instalar en pantalla de inicio"**
- Debes usar Safari (no Chrome u otro navegador)
- La app debe estar en un servidor HTTPS

---

## 📄 Licencia

Esta aplicación es de uso personal y profesional.

---

## 🙏 Créditos

Desarrollado para conductores profesionales que necesitan cumplir con las regulaciones DOT.

**HOS Tracker** - *Smart Route Planning for Truckers*

---

**Versión:** 1.0.0  
**Última actualización:** Febrero 2026

---

## 🔧 Mantenimiento (notas técnicas)

### Avisos comunitarios compartidos
Los reportes (policía, báscula, etc.) se sincronizan vía Firebase Realtime
Database (nodo público `community_reports`, REST sin SDK). **Requiere
desplegar las reglas** una vez:
```
firebase deploy --only database
```
o pegar `database.rules.json` en Firebase Console → Realtime Database →
Rules. Mientras no se desplieguen, la app degrada al modo local anterior.

### GPS en segundo plano (app nativa)
El plugin `@capacitor-community/background-geolocation` ya está integrado
en el servicio central HOSGps. Para activarlo hay que compilar el build
nativo (`npm run build` y abrir `android/`/`ios/` en Android Studio/Xcode).
Como PWA en Safari/Chrome el sistema sigue suspendiendo el GPS en
segundo plano — es una limitación del navegador, no de la app.

### Seguridad: clave de TomTom
La clave de TomTom va embebida en el cliente (inevitable sin backend).
**Restríngela por dominio** en developer.tomtom.com → tu app → Allowed
Origins: `lloammes81.github.io`. Ideal a futuro: un proxy (Cloudflare
Worker) que la oculte por completo.

### Pendientes conocidos
- `index.html` es un monolito de ~1.4 MB; separar CSS/JS/datos de ciudades
  permitiría cachear por partes y acelerar actualizaciones.
- `dash.png` (2 MB) y `logo.png` (0.5 MB) deberían comprimirse a WebP
  (no había herramientas de imagen en el entorno de CI).
