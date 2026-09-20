# src/server — Agent Guide

## Summary

Backend layer: cross-cutting utilities, middleware, Prisma schema, and business-logic services.

## Content

- `core/` — cross-cutting utilities shared by every service. Not domain-specific. See [core/AGENTS.md](core/AGENTS.md).
- `middlewares/` — request middleware dispatched from `src/middleware.ts`. See [middlewares/AGENTS.md](middlewares/AGENTS.md).
- `prisma/` — `schema.prisma` (models: `users`, `projects`, `endpoint_groups`, `endpoints`, `endpoint_scenarios`, `ai_usage_logs`), `prisma_provider.ts` (singleton client), `scripts/` (one-off migration scripts).
- `services/` — business logic, one class/object per domain. See [services/AGENTS.md](services/AGENTS.md).

## Conventions

- **Error normalization**: every service method funnels its persistence call through `guardService` (`core/errors.ts`), so a driver error never reaches a route as anything but an `AppError`. Older services still write that try/catch by hand and mean the same thing; new code uses the helper.
- **One database object is invisible to `schema.prisma`.** `endpoint_scenarios_one_active_idx` is a partial unique index, `ON ("endpoints_id") WHERE "is_active"`, and Prisma's `@@unique` has no `where` to declare it with. `prisma migrate diff` would report it as drift; nothing in `package.json` runs that, and every migration here is written by hand. It is what holds an endpoint to at most one answering scenario.
- **Middleware contract**: each middleware function returns either `null` (continue the request) or a `NextResponse` (short-circuit — a rewrite or an `ApiResponse.error`). `src/middleware.ts` dispatches on that return value.

Naming, ID, and other conventions that also apply outside `src/server` are in the root [AGENTS.md](../../AGENTS.md).
