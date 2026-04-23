# reviews — Memory Palace — Task Kanban Auto-Scoring

---

### [2026-04-22] [revisor-seguridad] — auditoría pre-migración HttpOnly cookies

**Archivo/línea:** `frontend/src/app/services/auth.service.ts` — post-migración
**Problema:** Sin referencias a localStorage. `withCredentials: true` en todas las llamadas. `getToken()` retorna `null` explícitamente. Signal inicializado en `false`.
**Severidad:** info — OK

**Archivo/línea:** `frontend/src/app/interceptors/auth.interceptor.ts:3-4`
**Problema:** Interceptor simplificado a solo `withCredentials: true`. Sin inyección de token Bearer. Sin dependencias de servicio.
**Severidad:** info — OK

**Archivo/línea:** `frontend/src/app/app.config.ts:10`
**Problema:** `withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })` configurado correctamente. Angular gestiona el header CSRF automáticamente.
**Severidad:** info — OK

**Archivo/línea:** `backend/app/Http/Controllers/AuthController.php:26,46` (pre-fix)
**Problema:** `plainTextToken` retornado en body del response exponía el token a JavaScript, anulando la protección de HttpOnly.
**Severidad:** alto — RESUELTO (`Auth::login()` + `session()->regenerate()`, sin token en response)

**Archivo/línea:** `backend/routes/api.php:7-8` (pre-fix)
**Problema:** Sin rate limiting en rutas públicas `/register` y `/login` — superficie de ataque de fuerza bruta.
**Severidad:** alto — RESUELTO (`throttle:10,1` aplicado)

**Archivo/línea:** `backend/.env:67`
**Problema:** `SANCTUM_STATEFUL_DOMAINS` no incluía `localhost:4200` — Sanctum no emitiría cookies de sesión para el frontend Angular.
**Severidad:** crítico — RESUELTO (variable agregada)

**Archivo/línea:** `backend/app/Http/Middleware/LogCrudOperations.php`
**Problema:** Log registra method, path, user_id, ip, status_code, duration_ms. Sin body, sin tokens, sin passwords.
**Severidad:** info — OK

**Archivo/línea:** `backend/.env:32` — `SESSION_ENCRYPT=false`
**Problema:** Datos de sesión almacenados sin cifrado en BD. Aceptable en desarrollo local. En producción debe activarse.
**Severidad:** medio — pendiente en producción (agregar `SESSION_ENCRYPT=true` al `.env` de producción)

**Archivo/línea:** `backend/config/cors.php`
**Problema:** `supports_credentials: true` activado. `allowed_origins` cubre `localhost:4200`. Correcto para el flujo de cookies.
**Severidad:** info — OK

**Conclusión:** Los dos bloqueantes críticos/altos (`plainTextToken` en response + `SANCTUM_STATEFUL_DOMAINS`) fueron resueltos en este ciclo. El rate limiting en auth también aplicado. La migración a HttpOnly cookies es segura para proceder. Pendiente solo para hardening de producción: `SESSION_ENCRYPT=true` y definir `FRONTEND_URL` explícito en `.env.example`.

---

## Auditoría completa [2026-04-22] — revisor-seguridad senior

> Cobertura: backend (Laravel 13, Sanctum session mode) + frontend (Angular 19, HttpOnly cookies).
> Archivos auditados: 13 backend + 9 frontend + migraciones + seeders + tests.

---

### A. AUTENTICACIÓN Y SESIÓN

---

### [2026-04-22] [revisor-seguridad] — ✓ HttpOnly session correctamente implementada
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `AuthController` usa `Auth::login()` + `session()->regenerate()` en login y register; `Auth::logout()` + `session()->invalidate()` + `session()->regenerateToken()` en logout. Nunca se emite ni retorna un `plainTextToken`. La cookie `laravel_session` es HttpOnly — inaccesible desde JS. Implementación correcta y completa.

---

### [2026-04-22] [revisor-seguridad] — ✓ CSRF protegido correctamente vía XSRF-TOKEN
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `app.config.ts:10` configura `withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' })`. Angular lee la cookie `XSRF-TOKEN` (no HttpOnly, readable) y la inyecta como header `X-XSRF-TOKEN` en cada mutación. Laravel valida ese header via `ValidateCsrfToken`. Flujo estándar y correcto de Sanctum SPA.

---

### [2026-04-22] [revisor-seguridad] — ✓ withCredentials: true en todas las requests
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `authInterceptor` clona cada request con `withCredentials: true`. Las llamadas explícitas en `auth.service.ts` también lo especifican redundantemente, lo cual es una doble garantía aceptable. Las llamadas de `task.service.ts` son cubiertas por el interceptor.

---

### [2026-04-22] [revisor-seguridad] — ✓ Logout invalida sesión server-side
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `AuthController::logout()` llama `Auth::logout()`, `session()->invalidate()` y `session()->regenerateToken()`. La sesión se destruye completamente en el servidor. El frontend hace `isLoggedIn.set(false)` de forma optimista pero no depende del estado local para la autorización.

---

### [2026-04-22] [revisor-seguridad] — logout() en frontend: fire-and-forget sin manejo de error crítico
**Archivo/línea:** `frontend/src/app/services/auth.service.ts:63-68`
**Problema:** `logout()` es `void` y llama `subscribe({ error: () => {} })` — un error de red silencia el error completo. Si el POST a `/api/logout` falla por timeout o error 500, el backend no invalida la sesión pero el frontend marca `isLoggedIn = false`, dejando una sesión huérfana activa en el servidor.
**CVSS v3.1:** 3.1 — AV:N/AC:H/PR:L/UI:R/S:U/C:L/I:N/A:N
**Severidad:** bajo (3.1)
**Fix sugerido:** Redirigir al usuario a la pantalla de login independientemente del resultado (ya se hace), pero loguear el error en consola para debugging. Más importante: agregar un timeout agresivo al POST de logout para no bloquear la UI, y considerar retornar un `Observable<void>` para que el componente pueda reaccionar:
```typescript
logout(): Observable<void> {
  return this.http.post<void>(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
    tap({ complete: () => this.isLoggedIn.set(false), error: () => this.isLoggedIn.set(false) }),
    catchError(() => of(undefined as void))
  );
}
```

---

### [2026-04-22] [revisor-seguridad] — register() no solicita CSRF cookie antes del POST
**Archivo/línea:** `frontend/src/app/services/auth.service.ts:53-61`
**Problema:** `register()` hace directamente `POST /api/register` sin llamar previamente `GET /sanctum/csrf-cookie`. En un usuario que llega limpio (sin sesión previa), el navegador no tiene la cookie `XSRF-TOKEN` todavía, por lo que Angular no puede inyectar el header `X-XSRF-TOKEN` y la request puede fallar con 419 CSRF Token Mismatch. Esto no es un problema de seguridad (el CSRF está protegido), pero es un defecto de robustez que puede causar errores en flujos nuevos.
**CVSS v3.1:** 0.0 — N/A (fallo funcional, no de seguridad)
**Severidad:** info — defecto funcional
**Fix sugerido:** Encadenar `GET /sanctum/csrf-cookie` antes del POST en `register()`, igual que hace `login()`:
```typescript
register(name: string, email: string, password: string): Observable<AuthResponse> {
  return this.http.get(`${this.baseUrl}/sanctum/csrf-cookie`, { withCredentials: true }).pipe(
    switchMap(() => this.http.post<AuthResponse>(
      `${this.apiUrl}/register`,
      { name, email, password, password_confirmation: password },
      { withCredentials: true },
    )),
    tap(() => this.isLoggedIn.set(true)),
  );
}
```

---

### [2026-04-22] [revisor-seguridad] — SESSION_SECURE_COOKIE sin definir: cookies enviadas en HTTP en producción
**Archivo/línea:** `backend/.env:30-34` / `backend/config/session.php:172`
**Problema:** `SESSION_SECURE_COOKIE` no aparece en `.env` — `config('session.secure')` resuelve a `null`, que PHP castea a `false`. Esto significa que la cookie `laravel_session` (HttpOnly) puede ser enviada sobre conexiones HTTP no cifradas en producción, exponiendo la sesión a ataques MITM (man-in-the-middle) en redes no seguras. En desarrollo local con HTTP es aceptable, pero el `.env.example` también muestra `APP_URL=http://localhost` sin advertencia.
**CVSS v3.1:** 5.9 — AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N
**Severidad:** medio (5.9) — crítico en producción con HTTPS
**Fix sugerido:** Agregar al `.env` de producción y al `.env.example` (como comentario):
```ini
SESSION_SECURE_COOKIE=true   # Must be true when serving over HTTPS
```
Y en `config/session.php`, cambiar el default a `true` para producción:
```php
'secure' => env('SESSION_SECURE_COOKIE', env('APP_ENV') === 'production'),
```

---

### B. AUTORIZACIÓN

---

### [2026-04-22] [revisor-seguridad] — CRÍTICO: TaskController no filtra tasks por user_id — IDOR completo
**Archivo/línea:** `backend/app/Http/Controllers/TaskController.php:11-55` / `backend/database/migrations/2024_01_01_000001_create_tasks_table.php`
**Problema:** La tabla `tasks` no tiene columna `user_id`. `TaskController::index()` retorna `Task::orderByDesc('priority_score')->get()` — TODAS las tareas de todos los usuarios. `show()`, `update()` y `destroy()` operan sobre cualquier task por ID sin verificar si pertenece al usuario autenticado. Un usuario autenticado puede leer, modificar y eliminar las tareas de cualquier otro usuario simplemente conociendo el ID (Insecure Direct Object Reference). La ausencia de `user_id` en el modelo y la migración confirma que el sistema fue diseñado como multi-user sin isolación de datos.
**CVSS v3.1:** 8.1 — AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N
**Severidad:** alto (8.1)
**Fix sugerido:**
1. Crear migración para agregar `user_id` a `tasks`:
```php
$table->foreignId('user_id')->constrained()->cascadeOnDelete();
```
2. Agregar relación en `Task` model: `belongsTo(User::class)`.
3. En `TaskController`, filtrar por usuario autenticado:
```php
// index
Task::where('user_id', auth()->id())->orderByDesc('priority_score')->get();
// store
$validated['user_id'] = auth()->id();
// show / update / destroy — usar policy o gate
abort_if($task->user_id !== auth()->id(), 403);
```
4. Alternativamente, registrar un `TaskPolicy` en Laravel con `viewAny`, `view`, `update`, `delete` comprobando `$user->id === $task->user_id`.

---

### [2026-04-22] [revisor-seguridad] — ✓ Todas las rutas de tasks protegidas con auth:sanctum
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `routes/api.php:12-16` envuelve `apiResource('tasks', ...)` en `middleware(['auth:sanctum', 'throttle:api', 'log.crud'])`. Las rutas públicas solo son `/register` y `/login`. Los tests confirman que requests sin sesión retornan 401 (`TaskScoringTest.php:66-69`).

---

### [2026-04-22] [revisor-seguridad] — ✓ TaskObserver no es triggerable externamente
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `TaskObserver` está registrado vía atributo PHP `#[ObservedBy([TaskObserver::class])]` en el modelo — es un hook interno del ORM, no un endpoint. El método `recalculate()` es `private`. No hay ruta que lo invoque directamente.

---

### C. VALIDACIÓN E INYECCIÓN

---

### [2026-04-22] [revisor-seguridad] — priority_score en $fillable permite escritura directa desde API
**Archivo/línea:** `backend/app/Models/Task.php:17`
**Problema:** `priority_score` está en `$fillable`. El `TaskController::store()` no incluye `priority_score` en las reglas de validación, así que no puede llegar del request — PERO si el frontend (o un actor malicioso) envía `priority_score` en el body del POST/PUT, Laravel lo incluirá en `$validated` solo si pasa la validación. Como `store()` y `update()` usan `$request->validate([...])` sin `priority_score`, el campo extra es ignorado por Eloquent's `create($validated)`. Sin embargo, si alguien añade `priority_score` a las reglas de validación en el futuro (ej. con `sometimes|numeric`), el campo se escribiría directamente sin pasar por el observer. El riesgo actual es bajo, pero la arquitectura es frágil.
**CVSS v3.1:** 2.7 — AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:L/A:N
**Severidad:** bajo (2.7)
**Fix sugerido:** Remover `priority_score` de `$fillable`. Es un campo calculado y nunca debe ser masa-asignable:
```php
protected $fillable = [
    'title', 'description', 'complexity', 'urgency', 'status',
    // 'priority_score' — REMOVED: computed field, set by TaskObserver only
];
```

---

### [2026-04-22] [revisor-seguridad] — ✓ complexity y urgency validan rango 1-10
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `TaskController::store()` y `update()` definen `'complexity' => 'required|integer|min:1|max:10'` y `'urgency' => 'required|integer|min:1|max:10'`. El tipo `unsignedTinyInteger` en la migración añade una segunda capa de restricción a nivel BD (0-255). Sin SQL injection posible — Eloquent usa PDO con bindings preparados.

---

### [2026-04-22] [revisor-seguridad] — ✓ Sin SQL injection: Eloquent ORM con bindings preparados
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** Grep de `DB::`, `->whereRaw(`, `->selectRaw(` en `backend/app/` no produce resultados. Toda interacción con BD usa Eloquent ORM (bindings parametrizados automáticos). El único `->where(` es implícito en route model binding de Laravel, que también usa bindings. Sin riesgo de SQL injection.

---

### [2026-04-22] [revisor-seguridad] — ✓ Mass assignment protegido en User model
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `User` usa atributo `#[Fillable(['name', 'email', 'password'])]` — solo tres campos fillable, todos validados en `AuthController`. `email_verified_at`, `remember_token` no son fillable. `password` se hashea via cast `'hashed'` antes de persistir.

---

### [2026-04-22] [revisor-seguridad] — ✓ Sin debug statements en código de producción (backend)
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** Grep de `dd(`, `var_dump(`, `dump(` en `backend/app/` retorna cero resultados. Sin leaks de datos en responses de producción.

---

### D. EXPOSICIÓN DE DATOS

---

### [2026-04-22] [revisor-seguridad] — User expuesto completo en responses de auth (email_verified_at, timestamps)
**Archivo/línea:** `backend/app/Http/Controllers/AuthController.php:31,52`
**Problema:** `register()` y `login()` retornan `['user' => $user]` directamente, lo que serializa el modelo User completo incluyendo `name`, `email`, `email_verified_at`, `created_at`, `updated_at`. Los campos `password` y `remember_token` están ocultos vía `#[Hidden]`, pero `email_verified_at` y timestamps se exponen innecesariamente. Para un Kanban board solo el frontend necesita `id`, `name` y `email`.
**CVSS v3.1:** 2.7 — AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N
**Severidad:** bajo (2.7)
**Fix sugerido:** Usar un array explícito o API Resource:
```php
return response()->json(['user' => [
    'id'    => $user->id,
    'name'  => $user->name,
    'email' => $user->email,
]], 201);
```

---

### [2026-04-22] [revisor-seguridad] — APP_DEBUG=true en .env activo: stacktraces expuestos en errores 500
**Archivo/línea:** `backend/.env:4`
**Problema:** `APP_DEBUG=true` está habilitado. `Handler.php:53` tiene lógica condicional: `config('app.debug') ? $e->getMessage() : 'An unexpected error occurred.'` — con `APP_DEBUG=true`, el mensaje de la excepción (que puede incluir rutas de archivo, queries SQL, nombres de variables, stack traces) se expone en responses JSON 500. En desarrollo local es aceptable. Si el mismo `.env` se deployan a producción sin cambios, se exponen detalles internos de la aplicación a cualquier atacante.
**CVSS v3.1:** 5.3 — AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N
**Severidad:** medio (5.3) — crítico si llega a producción
**Fix sugerido:** En producción (o en `.env.example` como advertencia):
```ini
APP_ENV=production
APP_DEBUG=false
```
Considerar un check de guardia en `AppServiceProvider::boot()`:
```php
if (app()->isProduction() && config('app.debug')) {
    throw new \RuntimeException('APP_DEBUG must be false in production.');
}
```

---

### [2026-04-22] [revisor-seguridad] — Handler.php: mensaje de error en 401 dice "Bearer token" en modo session
**Archivo/línea:** `backend/app/Exceptions/Handler.php:35`
**Problema:** El handler de `AuthenticationException` retorna `'A valid Bearer token is required.'` — pero la app usa Sanctum session mode (cookies), no Bearer tokens. Este mensaje confuso no es un problema de seguridad directo, pero puede orientar a un atacante sobre el mecanismo de autenticación esperado, y crea confusión en debugging legítimo.
**CVSS v3.1:** 0.0 — N/A (info leak menor)
**Severidad:** info
**Fix sugerido:** Cambiar el mensaje a uno genérico: `'Authentication required.'`

---

### [2026-04-22] [revisor-seguridad] — ✓ password y remember_token ocultos en serialización de User
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `#[Hidden(['password', 'remember_token'])]` en `User.php:15` garantiza que estos campos nunca aparezcan en responses JSON. El cast `'password' => 'hashed'` además aplica bcrypt automáticamente. `$dontFlash` en `Handler.php:14-18` excluye `password` y `password_confirmation` de los flash de sesión en errores de validación.

---

### E. CONFIGURACIÓN Y HARDENING

---

### [2026-04-22] [revisor-seguridad] — ✓ Rate limiting en rutas de auth: throttle:10,1
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `routes/api.php:7-10` aplica `throttle:10,1` (10 requests por minuto) a `/register` y `/login`. Las rutas autenticadas usan el rate limiter `api` definido en `AppServiceProvider` (60 req/min por user_id o IP). Protección adecuada contra brute-force.

---

### [2026-04-22] [revisor-seguridad] — CORS: allowed_methods y allowed_headers con wildcard (*)
**Archivo/línea:** `backend/config/cors.php:5,8`
**Problema:** `'allowed_methods' => ['*']` y `'allowed_headers' => ['*']` aceptan cualquier método HTTP y cualquier header. Con `supports_credentials: true`, esto es permisivo — aunque CORS no protege contra CSRF (para eso está el XSRF-TOKEN), aceptar métodos arbitrarios como `TRACE`, `CONNECT`, `PROPFIND` podría habilitar vectores de Cross-Site Tracing (XST) si el servidor web los acepta. El riesgo es bajo dado que Laravel ignora métodos no enrutados.
**CVSS v3.1:** 3.1 — AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N
**Severidad:** bajo (3.1)
**Fix sugerido:** Restringir a métodos y headers necesarios:
```php
'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
'allowed_headers' => ['Content-Type', 'X-Requested-With', 'X-XSRF-TOKEN', 'Accept', 'Origin'],
```

---

### [2026-04-22] [revisor-seguridad] — ✓ CORS allowed_origins restringido a FRONTEND_URL
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `cors.php:6` usa `env('FRONTEND_URL', 'http://localhost:4200')` — un único origen. No hay wildcards en orígenes. Con `supports_credentials: true`, el navegador rechaza respuestas con origen wildcard `*`, y Laravel lo implementa correctamente con el origen específico.

---

### [2026-04-22] [revisor-seguridad] — ✓ Sanctum stateful_domains específico
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `SANCTUM_STATEFUL_DOMAINS=localhost:4200` en `.env:67`. `config/sanctum.php:18-23` lo lee correctamente con `explode(',', env(...))`. Solo `localhost:4200` recibe cookies de sesión stateful.

---

### [2026-04-22] [revisor-seguridad] — session.same_site=lax: adecuado para SPA cross-origin pero verificar producción
**Archivo/línea:** `backend/config/session.php:202`
**Problema:** `same_site = lax` (default). Para una SPA Angular en origen diferente (ej. `app.example.com` → `api.example.com`), `SameSite=Lax` bloquea las cookies en requests POST cross-site iniciados por el navegador. Sin embargo, dado que el frontend y backend comparten el mismo dominio raíz en producción típica, esto es aceptable. Si el deploy usa subdominios distintos (ej. `frontend.company.com` → `api.company.com`), se necesitaría `SameSite=None; Secure`. El riesgo actual es funcional, no de seguridad.
**CVSS v3.1:** 0.0 — N/A (funcional)
**Severidad:** info — revisar en deploy
**Fix sugerido:** Documentar en `.env.example`:
```ini
# SESSION_SAME_SITE=none  # Use 'none' (with SESSION_SECURE_COOKIE=true) if frontend and backend are on different domains
SESSION_SAME_SITE=lax
```

---

### [2026-04-22] [revisor-seguridad] — SESSION_ENCRYPT=false: payload de sesión en BD sin cifrar
**Archivo/línea:** `backend/.env:32` / `backend/config/session.php:50`
**Problema:** Ya identificado en auditoría anterior. Con `SESSION_ENCRYPT=false`, el payload de la tabla `sessions` se almacena como JSON serializado base64 — legible para quien tenga acceso a la BD. Contiene el estado de la sesión (no el password, pero sí el user_id y datos de flash). En producción con acceso a la BD comprometido, esto facilita la enumeración de sesiones activas.
**CVSS v3.1:** 4.9 — AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:N/A:N
**Severidad:** medio (4.9) — requiere compromiso previo de BD
**Fix sugerido:** `SESSION_ENCRYPT=true` en producción. Ya documentado en auditoría anterior.

---

### [2026-04-22] [revisor-seguridad] — ✓ session.serialization = json: sin riesgo de gadget chain
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `config/session.php:231` usa `'serialization' => 'json'` (no `'php'`). El comentario del framework advierte que `'php'` puede ser vulnerable a gadget chain attacks si `APP_KEY` se filtra. La elección de JSON elimina ese vector completamente.

---

### F. LOGGING Y MONITOREO

---

### [2026-04-22] [revisor-seguridad] — ✓ LogCrudOperations no loguea datos sensibles
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** El middleware loguea: `method`, `path`, `user_id`, `ip`, `status_code`, `duration_ms`. Sin body del request, sin passwords, sin tokens, sin PII más allá de IP y user_id. Correcto.

---

### [2026-04-22] [revisor-seguridad] — Intentos fallidos de login no se loguean explícitamente
**Archivo/línea:** `backend/app/Http/Controllers/AuthController.php:43-46`
**Problema:** Cuando `!$user || !Hash::check(...)`, se lanza `ValidationException` que genera un response 422. El `LogCrudOperations` middleware sí loguea el `status_code: 422` y el path `/api/login`, lo cual permite detectar patrones de brute-force retrospectivamente. Sin embargo, no se loguea explícitamente el email intentado ni se emite un evento de seguridad dedicado. Para detección de ataques activa (SIEM, alertas), sería mejor un log explícito.
**CVSS v3.1:** 0.0 — N/A (deficiencia de monitoreo, no de seguridad directa)
**Severidad:** info — mejora recomendada
**Fix sugerido:**
```php
if (! $user || ! Hash::check($request->password, $user->password)) {
    Log::channel('crud')->warning('Login failed', [
        'email' => $request->email,
        'ip'    => $request->ip(),
    ]);
    throw ValidationException::withMessages([...]);
}
```

---

### [2026-04-22] [revisor-seguridad] — TaskObserver loguea 'title' en creating: posible info en logs
**Archivo/línea:** `backend/app/Observers/TaskObserver.php:13`
**Problema:** `Log::channel('crud')->info('Task creating', ['title' => $task->title])` — el título de la tarea se escribe en los logs. Esto es menor, pero si los títulos contienen información sensible (números de tickets, nombres de clientes, datos internos), quedarían en los logs de acceso. No es un hallazgo crítico, pero conviene estandarizar qué datos del dominio de negocio van a logs.
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — mejora recomendada
**Fix sugerido:** Considerar loguear solo el `id` (disponible solo en `created`, no en `creating`) o un hash/truncado del título en `creating`.

---

### G. FRONTEND

---

### [2026-04-22] [revisor-seguridad] — ✓ Sin XSS: Angular usa interpolación segura, sin innerHTML ni bypassSecurity
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** Todos los templates Angular usan interpolación `{{ }}` y bindings de propiedad `[property]` — Angular los escapa automáticamente. Grep de `innerHTML`, `bypassSecurityTrustHtml`, `DomSanitizer`, `[innerHTML]` en `frontend/src/` retorna cero resultados. Los datos de usuario (title, description) se renderizan como texto, no como HTML.

---

### [2026-04-22] [revisor-seguridad] — ✓ Sin localStorage en el código post-migración
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** Grep de `localStorage` en `frontend/src/` retorna cero resultados. La migración a HttpOnly cookies es completa.

---

### [2026-04-22] [revisor-seguridad] — ✓ Sin console.log en código de producción
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** Grep de `console.log` en `frontend/src/` retorna cero resultados. Sin leaks de datos en la consola del browser.

---

### [2026-04-22] [revisor-seguridad] — environment.ts hardcodeado con http:// y localhost:8000
**Archivo/línea:** `frontend/enviroments/environment.ts:3`
**Problema:** `apiUrl: 'http://localhost:8000/api'` — URL con protocolo HTTP sin TLS. En desarrollo local es intencional, pero si este archivo se commitea y se usa en staging/producción sin cambiar, todas las requests API irán por HTTP exponiendo credenciales y cookies de sesión en tránsito (aunque `laravel_session` es HttpOnly, un MITM puede leer el body de las requests de login que contienen email+password en texto plano).
**CVSS v3.1:** 5.9 — AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N
**Severidad:** medio (5.9) — solo en contexto de producción
**Fix sugerido:** Verificar que `environment.ts` está en `.gitignore`. El `environment.example.ts` ya usa `http://YOUR_HOST:YOUR_PORT/api` (sin valores reales) — correcto. Agregar `enviroments/environment.ts` y `enviroments/environment.production.ts` al `.gitignore` del frontend si no están ya.

---

### [2026-04-22] [revisor-seguridad] — ✓ environment.example.ts no expone valores reales
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `environment.example.ts` usa placeholders `YOUR_HOST:YOUR_PORT` sin valores reales. No hay API keys, secrets, tokens ni credenciales hardcodeadas. El archivo de ejemplo es seguro para commitear.

---

### [2026-04-22] [revisor-seguridad] — error message de login expone estructura interna de errores de validación
**Archivo/línea:** `frontend/src/app/components/login/login.component.ts:264`
**Problema:** `err?.error?.messages?.email?.[0]` — el componente accede directamente a la estructura del objeto de error de validación de Laravel (`{ error, messages: { email: [...] } }`). Esto acopla el frontend a la estructura interna del backend. Más relevante desde seguridad: si el backend cambia su formato de error, el fallback `?? err?.error?.message ?? 'Authentication failed'` revela el mensaje crudo del servidor al usuario. En el caso de un 500 con `APP_DEBUG=true`, esto podría mostrar un stack trace en la UI.
**CVSS v3.1:** 2.7 — AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N
**Severidad:** bajo (2.7)
**Fix sugerido:** Sanitizar el mensaje antes de mostrarlo: limitar a mensajes conocidos y evitar mostrar mensajes crudos del servidor si el status es 500:
```typescript
error: (err) => {
  this.loading.set(false);
  if (err.status >= 500) {
    this.error.set('A server error occurred. Please try again later.');
    return;
  }
  const msg = err?.error?.messages?.email?.[0] ?? err?.error?.message ?? 'Authentication failed. Please try again.';
  this.error.set(msg);
}
```

---

### [2026-04-22] [revisor-seguridad] — ✓ Sin URLs hardcodeadas fuera de environment en servicios
**CVSS v3.1:** 0.0 — N/A
**Severidad:** info — OK
**Nota:** `task.service.ts` y `auth.service.ts` usan exclusivamente `environment.apiUrl`. El patrón `baseUrl = environment.apiUrl.replace('/api', '')` para `/sanctum/csrf-cookie` es correcto y no hardcodea ningún hostname. No se encontraron `fetch()`, `axios`, `XMLHttpRequest` ni strings de URL literales fuera de environment.

---

### RESUMEN EJECUTIVO — Auditoría completa 2026-04-22

| # | Hallazgo | CVSS | Severidad |
|---|----------|------|-----------|
| 1 | IDOR: TaskController sin filtro user_id — cualquier usuario modifica tasks de otro | 8.1 | **alto** |
| 2 | SESSION_SECURE_COOKIE sin definir — cookies enviadas en HTTP | 5.9 | medio |
| 3 | APP_DEBUG=true en .env — stacktraces en responses 500 | 5.3 | medio |
| 4 | SESSION_ENCRYPT=false — payload de sesión sin cifrar en BD | 4.9 | medio |
| 5 | CORS allowed_methods y allowed_headers con wildcard (*) | 3.1 | bajo |
| 6 | logout() fire-and-forget: sesión huérfana en error de red | 3.1 | bajo |
| 7 | priority_score en $fillable — campo calculado masa-asignable | 2.7 | bajo |
| 8 | User expuesto completo en responses de auth | 2.7 | bajo |
| 9 | Error message en login puede exponer estructura interna | 2.7 | bajo |
| 10 | environment.ts con http:// localhost si se deploya sin cambiar | 5.9 | medio (contexto) |
| 11 | register() sin GET /sanctum/csrf-cookie previo | 0.0 | info (funcional) |
| 12 | Handler.php: mensaje 401 dice "Bearer token" en modo session | 0.0 | info |
| 13 | Intentos fallidos de login no se loguean explícitamente | 0.0 | info |
| 14 | TaskObserver loguea 'title' en creating | 0.0 | info |
| 15 | session.same_site=lax: revisar en deploy con subdominios distintos | 0.0 | info |
| ✓ | HttpOnly cookies, CSRF, withCredentials, session regenerate | 0.0 | OK |
| ✓ | auth:sanctum en todas las rutas de tasks, tests de 401 | 0.0 | OK |
| ✓ | Validación complexity/urgency 1-10, sin SQL injection | 0.0 | OK |
| ✓ | Sin localStorage, sin console.log, sin XSS en frontend | 0.0 | OK |
| ✓ | Sin debug statements (dd, var_dump) en backend | 0.0 | OK |
| ✓ | session.serialization=json (sin gadget chain) | 0.0 | OK |
| ✓ | password/remember_token ocultos en serialización | 0.0 | OK |
| ✓ | Rate limiting: throttle:10,1 en auth, 60/min en API | 0.0 | OK |
