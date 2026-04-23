# code-notes — Memory Palace — Task Kanban Auto-Scoring

---

### [2026-04-22] [coder-backend] — fix IDOR: user_id en tasks + ownership checks
**Decisión de código:** Nueva migración `2026_04_22_200000_add_user_id_to_tasks_table.php` agrega `foreignId('user_id')->constrained()->cascadeOnDelete()`. `TaskController` filtra con `$request->user()->tasks()` en `index()` e inyecta `user_id` en `store()`. `show/update/destroy` usan `abort_if($task->user_id !== $request->user()->id, 403)`. `priority_score` eliminado de `$fillable` (campo calculado, no debe ser masa-asignable). `User::tasks()` relación `hasMany` agregada.
**Trampa evitada:** Usar `$task->user_id !== auth()->id()` en lugar de `!== $request->user()->id` — en session mode `auth()->id()` puede retornar null si el guard no está inicializado en el contexto del request; `$request->user()->id` siempre es el usuario autenticado del request actual.
**Patrón reusable:** `$request->user()->tasks()->...` es más explícito que `Task::where('user_id', auth()->id())` y garantiza el scope del usuario sin posibilidad de olvidar el filtro.

---

### [2026-04-22] [coder-frontend] — migración localStorage → HttpOnly cookies Sanctum
**Decisión de código:** `login()` encadena `GET /sanctum/csrf-cookie` → `POST /api/login` con `switchMap` en un solo Observable (`auth.service.ts:38-51`). El interceptor queda en 4 líneas sin dependencias de servicio (`auth.interceptor.ts:3-5`). `withXsrfConfiguration()` en `app.config.ts:10` delega el header `X-XSRF-TOKEN` a Angular automáticamente.
**Trampa evitada:** Inicializar `isLoggedIn` con `signal(!!localStorage.getItem(...))` habría devuelto siempre `false` en cookie-mode (la `laravel_session` es HttpOnly, JS no puede leerla). Solución correcta: `signal(false)` + `checkSession()` explícito al arrancar guards/componente raíz.
**Patrón reusable:** `baseUrl = apiUrl.replace('/api', '')` para derivar el origen del backend sin duplicar config — cualquier ruta fuera de `/api` (ej. `/sanctum/csrf-cookie`) usa esta propiedad calculada.

---

### [2026-04-22] [orquestador] — fix backend: session mode + throttle en auth
**Decisión de código:** `AuthController` eliminó `createToken()`/`plainTextToken` — ahora usa `Auth::login()` + `session()->regenerate()` en login/register y `Auth::logout()` + `session()->invalidate()` en logout (`AuthController.php:26-30`, `46-49`, `52-56`). Rutas `/register` y `/login` protegidas con `throttle:10,1` (`api.php:7-10`).
**Trampa evitada:** Devolver `plainTextToken` en el body del response anulaba el propósito de HttpOnly — el token quedaba accesible en JS aunque la cookie fuera segura. Con `Auth::login()` el token nunca sale del servidor.
**Patrón reusable:** En Sanctum session mode, `auth:sanctum` middleware autentica tanto por token Bearer como por sesión — los endpoints protegidos existentes no requieren cambios.
