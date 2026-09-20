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
- **A GET carries its ownership in the read; every other method asks first.** `core/ownership.ts` holds the three chains, and a service offers each read twice: the plain one, and a `getOwned…` whose `where` carries the chain. A GET route calls the scoped one and is done, because a row that comes back is one the caller may see, which is the same question `checkPermission` walks a query earlier to answer. Nothing coming back is both "not there" and "not yours", so the route hands `missingOrForbidden` (`core/route_helpers.ts`) the answer of a plain `…Exists` probe, and only a refusal ever pays for that second query. A list answers the same way once it comes back empty, since an empty list and a project belonging to somebody else look alike. Writes keep the check ahead of the write and keep the plain reads: the split buys a round trip on the path that runs on every page load, and a write is not that path. The status codes are the same either way, 403 for a row somebody else owns and 404 for one nobody does.
- **Middleware contract**: each middleware function returns either `null` (continue the request) or a `NextResponse` (short-circuit — a rewrite or an `ApiResponse.error`). `src/middleware.ts` dispatches on that return value.

Naming, ID, and other conventions that also apply outside `src/server` are in the root [AGENTS.md](../../AGENTS.md).
