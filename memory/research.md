# research — Memory Palace — Task Kanban Auto-Scoring

---

### [2026-04-22] [investigador-frontend] — librerías encriptación y patrón cookies Angular 19
**Pregunta:** comparativa crypto-js vs TweetNaCl vs Web Crypto API para cookies Angular
**Hallazgo:** Web Crypto API (nativa, cero bundle) es superior. crypto-js v4.2.0 (~43 KB, mantenimiento reducido, AES-CBC sin autenticación). TweetNaCl.js v1.0.3 (~7 KB gzip, XSalsa20-Poly1305) aceptable pero dependencia externa innecesaria. Web Crypto API usa `crypto.subtle` (AES-GCM 256-bit, IV aleatorio con `crypto.getRandomValues()`, async/await), disponible en todos los browsers que soporta Angular 19.
**Implicación:** No instalar ninguna librería. Si se elige encriptación cliente, implementar con `crypto.subtle.encrypt/decrypt`. El ciphertext va en Base64 + IV concatenado con `.`.

---

### [2026-04-22] [investigador-frontend] — patrón cookies en Angular service con inject()
**Pregunta:** cómo leer/escribir cookies seguras desde un Angular service sin librería externa
**Hallazgo:** Inyectar `DOCUMENT` de `@angular/common` vía `inject(DOCUMENT)`. Setear con `document.cookie = 'name=val; SameSite=Strict; Secure; Max-Age=604800; path=/'`. La flag `HttpOnly` NO se puede setear desde el frontend — solo el servidor puede emitirla. `Secure` en localhost es ignorado sin error por Chrome/Firefox.
**Implicación:** Un `CookieService` con `inject(DOCUMENT)` reemplaza localStorage. El signal `isLoggedIn` se inicializa leyendo la cookie en lugar de localStorage.

---

### [2026-04-22] [investigador-frontend] — HttpOnly cookies con Sanctum vs encriptación cliente
**Pregunta:** ¿cuál opción es más segura y menos invasiva dado el stack actual?
**Hallazgo:** HttpOnly cookies con Sanctum session mode es superior. Encriptación cliente NO protege contra XSS (la clave y el ciphertext coexisten en el mismo contexto JS). HttpOnly session mode: (1) frontend llama `GET /sanctum/csrf-cookie`, (2) `POST /login` con `withCredentials: true`, (3) Sanctum gestiona cookie `laravel_session` (HttpOnly) + `XSRF-TOKEN` (readable). El backend ya tiene `statefulApi()`, `supports_credentials: true` y CORS correcto. Solo falta `SANCTUM_STATEFUL_DOMAINS=localhost:4200` en `.env`. El interceptor cambia de `Authorization: Bearer` a `withCredentials: true` (Angular maneja `X-XSRF-TOKEN` automáticamente con `withXsrfConfiguration()`).
**Implicación:** Cambio mínimo en backend (env var). Cambio en frontend: interceptor + auth.service + app.config. Rutas API sin cambios. Drag-drop sin cambios.

---

### [2026-04-22] [investigador-frontend] — clave de encriptación en environment.ts
**Pregunta:** ¿es seguro guardar la clave en environment.ts gitignoreado?
**Hallazgo:** Gitignoreado protege el repo pero NO el bundle de producción — `ng build` inlinea `environment.ts` en el JS público. Cualquier atacante con acceso al bundle encuentra la clave. Encriptación cliente con clave en environment es seguridad por oscuridad, no seguridad real. La única solución correcta es que la clave nunca salga del servidor (APP_KEY de Laravel + HttpOnly).
**Implicación:** Refuerza la decisión de usar HttpOnly session mode. Si se elige encriptación cliente, documentar explícitamente que solo protege contra acceso físico al dispositivo, no contra XSS ni análisis del bundle.
