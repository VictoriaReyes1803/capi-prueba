# decisions — Memory Palace — Task Kanban Auto-Scoring

---

### [2026-04-22] [orquestador] — migrar localStorage a HttpOnly cookies con Sanctum session mode

**Contexto:** El token de autenticación vivía en `localStorage` en texto plano. Cualquier script con acceso al DOM podía leerlo (vector XSS). Se evaluaron tres opciones: encriptación cliente (crypto-js, TweetNaCl, Web Crypto API), HttpOnly cookies con Sanctum session mode, y mantener localStorage.

**Decisión:** Implementar **HttpOnly cookies con Sanctum session mode**.

- Frontend llama `GET /sanctum/csrf-cookie` → obtiene `XSRF-TOKEN` (readable) y activa la sesión.
- `POST /api/login` con `withCredentials: true` → Sanctum autentica y emite `laravel_session` (HttpOnly, inaccesible por JS).
- Cada request lleva `withCredentials: true`. Angular envía `X-XSRF-TOKEN` automáticamente vía `withXsrfConfiguration()`.
- El backend usa `Auth::login()` + `session()->regenerate()` — **nunca se crea ni devuelve un Sanctum token Bearer** al cliente.
- El frontend nunca ve el token; la cookie es gestionada por el browser y el servidor.

**Por qué:**
- Encriptación cliente (cualquier librería) NO protege contra XSS: la clave y el ciphertext coexisten en el mismo contexto JS. Es seguridad por oscuridad.
- HttpOnly es el único mecanismo que elimina el vector XSS sobre el token: JavaScript no puede acceder a la cookie aunque el atacante tenga ejecución de código en la página.
- Sanctum ya tenía `statefulApi()` activo, CORS con `supports_credentials: true` y `allowed_origins` correcto. El cambio en el backend fue mínimo (env var + refactor de AuthController + throttle).
- Cero librerías adicionales. Cero cambios en rutas API. Drag-drop y Signals sin modificar.

**Alternativas descartadas:**
- **crypto-js**: AES-CBC sin autenticación integrada, mantenimiento reducido, +43 KB de bundle. Descartado.
- **TweetNaCl.js**: mejor algoritmo (XSalsa20-Poly1305) pero sigue siendo encriptación cliente — no resuelve el problema de fondo.
- **Web Crypto API con encriptación cliente**: cero bundle overhead, pero la clave inlinada en el bundle JS es accesible a cualquiera que descargue la app. No aporta confidencialidad real del token.
- **Mantener localStorage**: inaceptable — dato sensible en texto plano accesible por cualquier script en la página.

**Archivos modificados en este ciclo:**
- `frontend/src/app/services/auth.service.ts` — eliminado localStorage, session mode
- `frontend/src/app/interceptors/auth.interceptor.ts` — simplificado a withCredentials
- `frontend/src/app/app.config.ts` — withXsrfConfiguration
- `frontend/enviroments/environment.ts` — eliminados authToken y storageKey
- `frontend/enviroments/environment.example.ts` — idem
- `backend/app/Http/Controllers/AuthController.php` — Auth::login(), sin plainTextToken
- `backend/routes/api.php` — throttle:10,1 en rutas de auth públicas
- `backend/.env` — SANCTUM_STATEFUL_DOMAINS=localhost:4200
