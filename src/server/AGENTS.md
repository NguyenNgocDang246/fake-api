# src/server — Agent Guide

## Summary

Backend layer: cross-cutting utilities, middleware, Prisma schema, and business-logic services.

## Content

- `core/` — cross-cutting utilities shared by every service. Not domain-specific. See [core/AGENTS.md](core/AGENTS.md).
- `middlewares/` — request middleware dispatched from `src/middleware.ts`. See [middlewares/AGENTS.md](middlewares/AGENTS.md).
- `prisma/` — `schema.prisma` (models: `users`, `projects`, `endpoint_groups`, `endpoints`, `ai_usage_logs`), `prisma_provider.ts` (singleton client), `scripts/` (one-off migration scripts).
- `services/` — business logic, one class/object per domain. See [services/AGENTS.md](services/AGENTS.md).

## Conventions

- **Error normalization**: every service method funnels its persistence call through `guardService` (`core/errors.ts`), so a driver error never reaches a route as anything but an `AppError`. Older services still write that try/catch by hand and mean the same thing; new code uses the helper.
- **Middleware contract**: each middleware function returns either `null` (continue the request) or a `NextResponse` (short-circuit — a rewrite or an `ApiResponse.error`). `src/middleware.ts` dispatches on that return value.

Naming, ID, and other conventions that also apply outside `src/server` are in the root [AGENTS.md](../../AGENTS.md).
