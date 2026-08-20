# Fake API — Agent Guide

## Summary

Next.js (App Router) app that lets a user define mock REST endpoints (project → endpoint group → endpoint) and serves them back as real HTTP responses. Postgres via Prisma.

## Content

- `src/app/` — Next.js routes: `api/**` (route handlers) and the UI pages.
- `src/server/` — backend layer (core utilities, middlewares, Prisma, services, and the shared LLM layer under `services/ai/`). See [src/server/AGENTS.md](src/server/AGENTS.md).
- `src/models/` — DTOs and Zod schemas, one file per domain (`auth`, `user`, `project`, `endpoint`, `endpoint_group`, `mail`, `api_response`).
- `src/middleware.ts` — Next.js middleware entry point, dispatches to `src/server/middlewares/*`.
- `test/backend/` — Jest tests for `src/app/api/**` and `src/server/services/**`. See `test/backend/README.md`.

Each directory with an `AGENTS.md` documents only its own contents — follow the links above rather than expecting this file to cover everything.

## Conventions

These are the conventions that cross multiple top-level directories. Anything specific to one directory (e.g. how services handle errors, how tokens work) lives in that directory's own `AGENTS.md` instead.

- **Naming**: files are `snake_case` with a type suffix (`*.service.ts`, `*.model.ts`); DB/DTO fields are `snake_case` to match Prisma columns (`public_id`, `token_version`, `is_verified`).
- **IDs**: rows are addressed externally by `public_id` (a generated short id), never the internal `BigInt id`. This is what shows up in URLs and API responses across both `src/app/api` and `src/server`.
- **`AGENTS.md` format**: every `AGENTS.md` in this repo (this file included) uses exactly three sections, in order — `## Summary` (what this directory is), `## Content` (breakdown of its files/subfolders), `## Conventions` (rules specific to this directory only). A directory's own conventions stay in its own file; only conventions that cross multiple top-level directories belong here in the root file.
- **Read before you edit**: before modifying any file inside a directory, read and understand that directory's `AGENTS.md` first (and the root one, for project-wide conventions). If it's missing or out of date after your change, update it as part of the same change.
