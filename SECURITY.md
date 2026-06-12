# Security Policy

## Reporting a Vulnerability

Reporta vulnerabilidades abriendo un issue privado o escribiendo al autor
(lloammes81). No publiques detalles explotables en issues públicos.

## Estado de seguridad de la app

### Medidas vigentes

- **Escapado de HTML**: todos los datos remotos (Firebase, reportes
  comunitarios, load boards) pasan por `escapeHtml`/`crEsc` antes de llegar a
  `innerHTML`, y los argumentos interpolados en handlers `onclick` inline
  pasan por `jsArg` (escape de contexto JS + HTML).
- **Content-Security-Policy** en `index.html` y `dashboard.html`: solo se
  permiten scripts de los CDNs usados (gstatic, unpkg, jsdelivr, cdnjs).
  `'unsafe-inline'` sigue siendo necesario por los handlers inline existentes.
- **Contraseñas (dashboard)**: PBKDF2-SHA256 con 150.000 iteraciones
  (formato `v3$<iter>$<hex>`). Los hashes legacy (SHA-256 simple) se migran
  automáticamente en el primer login exitoso.
- **Reglas de la Realtime Database** (`database.rules.json`): el nodo público
  `community_reports` valida tipo, tamaño máximo y rango de cada campo, y
  rechaza campos no reconocidos (`$other: false`).

### Cómo desplegar las reglas de la base de datos

Las reglas de `chat`, `fleets` y `companies` exigen `auth != null`. La app ya
intenta `signInAnonymously()` al arrancar (best-effort), pero para que ese
requisito funcione hay que hacerlo **en este orden**:

1. En la consola de Firebase: **Authentication → Sign-in method → Anonymous →
   Enable**.
2. Verificar que la app inicia sesión anónima (en DevTools:
   `firebase.auth().currentUser` no nulo, o ausencia de errores
   `permission_denied`).
3. Desplegar las reglas: `firebase deploy --only database`.

Si se despliegan las reglas **sin** habilitar Anonymous Auth, el dashboard y
la vinculación de flotas dejarán de funcionar (todas las escrituras serán
rechazadas).

### Limitaciones conocidas / trabajo futuro

- La clave de TomTom es visible en el cliente. Restringirla por dominio/origen
  en el portal de TomTom Developer, o moverla detrás de un proxy
  (p. ej. Cloudflare Worker).
- La clave de API de Firebase es pública por diseño; la protección real son
  las reglas de la base. Restringe la clave por dominio en la consola de
  Google Cloud para mayor higiene.
- No hay scoping por empresa en las reglas (`companies/$id` accesible para
  cualquier sesión autenticada). Requiere migrar el login propio del
  dashboard a Firebase Auth (email/contraseña) y reescribir las reglas con
  `auth.uid`.
- `community_reports` sigue siendo escribible sin autenticación (las apps de
  conductores no tienen login). La validación por campo limita el abuso, pero
  no lo elimina; rate-limiting requeriría Cloud Functions o App Check.
