# Kanban Board — Multi-Agent Architecture

## Stack

| Layer | Tech |
|---|---|
| Backend | Laravel (in `backend/`) |
| Frontend | Angular 19 Standalone (in `frontend/`) |
| Auth | Laravel Sanctum |
| DB | MySQL local (`kanban_db`) |
| Tests | Pest (Feature/Unit) |

## Environments (Angular)

Los archivos con valores reales están en `.gitignore`. Solo se commitea el template:

```
frontend/enviroments/
  environment.example.ts   ← commiteado (sin IPs ni tokens reales)
  environment.ts           ← gitignored (dev local)
  environment.production.ts← gitignored (producción)
```

Para empezar: copiar `environment.example.ts` → `environment.ts` y llenar los valores.

El interceptor HTTP lee `environment.authToken`; la URL base viene de `environment.apiUrl`.

## Running the project

```bash
# Backend
cd backend && php artisan serve        # http://localhost:8000

# Frontend
cd frontend && ng serve                # http://localhost:4200
```

## Database

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kanban_db
DB_USERNAME=root
DB_PASSWORD=
```

Reset DB: `cd backend && php artisan migrate:fresh --seed`

## Domain model

### Task

| Column | Type | Notes |
|---|---|---|
| id | bigint | PK |
| title | string | |
| description | text | nullable |
| complexity | int | 1–10 |
| urgency | int | 1–10 |
| priority_score | decimal | auto-computed by observer |
| status | string | `todo`, `in_progress`, `done` |

**Priority formula** (TaskObserver, fires on every save):
```
priority_score = (complexity * 0.4) + (urgency * 0.6)
```

### Key files

```
backend/
  app/Models/Task.php
  app/Models/User.php
  app/Observers/TaskObserver.php
  app/Http/Controllers/TaskController.php
  app/Http/Controllers/AuthController.php
  app/Http/Middleware/LogCrudOperations.php
  database/seeders/TaskSeeder.php          # 5 example tasks
  tests/Feature/TaskScoringTest.php        # complexity=5 urgency=10 → score=8.0

frontend/
  src/app/components/kanban-board/
  src/app/components/task-card/
  src/app/components/add-task-modal/
  src/app/components/login/
  src/app/services/task.service.ts
  src/app/services/auth.service.ts
  src/app/interceptors/                    # Bearer token injector
```

## API

All task routes require `Authorization: Bearer <token>`.

```
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/{id}
DELETE /api/tasks/{id}
POST   /api/login
```

Rate limit: 60 req/min. CRUD ops logged to `storage/logs/tasks.log`.

## Frontend rules (non-negotiable)

- **Signals only**: `signal()`, `computed()`, `toSignal()` — no `BehaviorSubject`
- **Control flow**: `@for`, `@if` — no `*ngFor` / `*ngIf`
- **DI**: `inject()` at field level — no constructor injection
- **HTTP auth**: `HttpInterceptorFn` injects `Bearer hardcoded_token_for_test`
- **Colors**: `#2d5016` (dark), `#4a7c3b` (mid), `#7ab84a` (light)
- Kanban columns: **To Do**, **In Progress**, **Done**
- Drag & drop updates `status` and triggers backend recalculation of `priority_score`

## Security agent responsibilities

- Sanctum validates Bearer token on every `/api/*` request
- Rate limiting middleware: 60 req/min
- `LogCrudOperations` middleware writes to `storage/logs/tasks.log`
- Centralized error handling — no raw exceptions to the client

## Tests

```bash
cd backend && php artisan test
```

Key assertion: `complexity=5, urgency=10 → priority_score=8.0`

## Agents

| Agent | Owns |
|---|---|
| Backend Agent | Laravel API, migrations, observer, seeder, tests |
| Frontend Agent | Angular Kanban, signals, drag & drop, interceptor |
| Security Agent | Sanctum, rate limiting, CRUD logging, error handling |
