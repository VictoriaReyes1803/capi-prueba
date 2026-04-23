# INDEX — Memory Palace — Task Kanban Auto-Scoring

> Mapa del cuaderno. Arquitectura: Laravel 13 + Angular 19 + MySQL local + Sanctum.

## Archivos activos
- [context](context.md) — misión, stack, requisitos
- [decisions](decisions.md) — decisiones de arquitectura
- [research](research.md) — hallazgos técnicos y validaciones
- [code-notes](code-notes.md) — decisiones de código backend + frontend
- [reviews](reviews.md) — hallazgos de seguridad y calidad
- [blockers](blockers.md) — unknowns y bloqueos activos
- [glossary](glossary.md) — terminología del proyecto

## Últimas entradas
<!-- formato: - [YYYY-MM-DD] [agente] → archivo#anchor — título -->
- [2026-04-22] [orquestador] → context.md — estado inicial del proyecto (stack, archivos clave, constraints)
- [2026-04-22] [investigador-frontend] → research.md — comparativa librerías encriptación (Web Crypto API recomendada)
- [2026-04-22] [investigador-frontend] → research.md — patrón cookies en Angular con inject(DOCUMENT)
- [2026-04-22] [investigador-frontend] → research.md — HttpOnly Sanctum vs encriptación cliente (HttpOnly ganó)
- [2026-04-22] [investigador-frontend] → research.md — riesgo de clave en environment.ts (inlinada en bundle)
- [2026-04-22] [coder-frontend] → code-notes.md — migración localStorage → HttpOnly cookies Sanctum
- [2026-04-22] [revisor-seguridad] → reviews.md — auditoría pre-migración: 3 hallazgos crítico/alto resueltos
- [2026-04-22] [orquestador] → code-notes.md — fix backend: AuthController session mode + throttle auth routes
- [2026-04-22] [orquestador] → decisions.md — decisión arquitectónica: HttpOnly cookies con Sanctum session mode
- [2026-04-22] [revisor-seguridad] → reviews.md — auditoría completa backend+frontend con CVSS
