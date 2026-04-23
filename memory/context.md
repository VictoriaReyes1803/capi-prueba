# context — Memory Palace — Task Kanban Auto-Scoring

## Misión
Kanban board con auto-scoring de tareas. Arrastrar una tarea actualiza su status;
el backend recalcula priority_score automáticamente vía TaskObserver.

## Stack
- Backend: Laravel 13, MySQL local (kanban_db), Sanctum (token Bearer)
- Frontend: Angular 19 Standalone, Signals ONLY, Angular CDK drag-drop
- Auth: Bearer token hardcodeado "hardcoded_token_for_test" para dev

## Estado actual del almacenamiento (2026-04-22)
- Token almacenado en localStorage con clave `environment.storageKey`
- `auth.service.ts` lee/escribe localStorage directamente (líneas 25, 28, 48, 53)
- Interceptor HTTP lee el token vía `AuthService.getToken()`
- Sin encriptación instalada (`package.json` no tiene crypto-js ni tweetnacl)

## Archivos clave frontend
- `frontend/src/app/services/auth.service.ts`
- `frontend/src/app/interceptors/auth.interceptor.ts`
- `frontend/enviroments/environment.ts` (gitignored — tiene apiUrl, authToken, storageKey)
- `frontend/enviroments/environment.example.ts` (commiteado — template sin valores reales)

## Constraints activos
- Signals ONLY (signal(), toSignal()) — prohibido BehaviorSubject
- Control flow: @for, @if
- inject() en componentes, sin constructor
- No cambiar rutas API existentes
- Mantener drag-drop funcional
- Cookies: Secure, SameSite=Strict
- Clave de encriptación NO en código fuente
