# Fake API — Agent Guide

## Summary

Next.js (App Router) app that lets a user define mock REST endpoints (project → endpoint group → endpoint) and serves them back as real HTTP responses. Postgres via Prisma.

## Content

- `src/app/` — Next.js routes: `api/**` (route handlers) and the UI pages. See [src/app/AGENTS.md](src/app/AGENTS.md).
- `src/server/` — backend layer (core utilities, middlewares, Prisma, services, and the shared LLM layer under `services/ai/`). See [src/server/AGENTS.md](src/server/AGENTS.md).
- `src/models/` — DTOs and Zod schemas, one domain per entry: a file for `auth`, `user`, `project`, `endpoint_group`, `mail` and `api_response`, and a folder for `endpoint/` and `endpoint_plan/`, each of which re-exports its parts from the file the folder is named after so a caller still imports one path. The blueprint DSL in `endpoint_plan/` has its own guide: [src/models/endpoint_plan/AGENTS.md](src/models/endpoint_plan/AGENTS.md).
- `src/middleware.ts` — Next.js middleware entry point, dispatches to `src/server/middlewares/*`. Its `matcher` skips static-looking paths on the app's own host but never on a mock host, which it recognizes by a literal copy of the project id alphabet that `test/backend/middlewares/middleware.test.ts` keeps in step. `next.config.ts` sets `skipTrailingSlashRedirect`, because Next's own redirect answers a mock host before middleware and without CORS headers, so the app's host gets that 308 from here and a mock serves `/users/` as `/users`.
- `test/backend/` — Jest tests for `src/app/api/**` and `src/server/services/**`. See `test/backend/README.md`.

Each directory with an `AGENTS.md` documents only its own contents — follow the links above rather than expecting this file to cover everything.

## Conventions

These are the conventions that cross multiple top-level directories. Anything specific to one directory (e.g. how services handle errors, how tokens work) lives in that directory's own `AGENTS.md` instead.

- **Naming**: under `src/server/` and `src/models/`, files are `snake_case`, and one that *is* a service, model or constants file carries that suffix (`endpoint.service.ts`, `endpoint.model.ts`, `ai.constants.ts`); a plain helper module does not invent one (`plan_hash.ts`, `route_helpers.ts`). Under `src/app/`, a component is `PascalCase.tsx` in a folder of its own name, beside a lowercase `viewmodel.ts`. DB/DTO fields are `snake_case` to match Prisma columns (`public_id`, `token_version`, `is_verified`) in every directory.
- **IDs**: rows are addressed externally by `public_id` (a generated short id), never the internal `BigInt id`. This is what shows up in URLs and API responses across both `src/app/api` and `src/server`.
- **`AGENTS.md` format**: every `AGENTS.md` in this repo (this file included) uses exactly three sections, in order — `## Summary` (what this directory is), `## Content` (breakdown of its files/subfolders), `## Conventions` (rules specific to this directory only). A directory's own conventions stay in its own file; only conventions that cross multiple top-level directories belong here in the root file.
- **Read before you edit**: before modifying any file inside a directory, read and understand that directory's `AGENTS.md` first (and the root one, for project-wide conventions). If it's missing or out of date after your change, update it as part of the same change.
- **Deploy**: Vercel builds through the `vercel-build` script, which runs `prisma migrate deploy` before `build` and only when `VERCEL_ENV` is `production`, so a preview deployment never migrates. A failing migration fails the build, leaving the old deployment serving. `build` itself only generates the Prisma client, so a local build never touches the database.
- **The mock host is a domain-level setup, not a code one**: a project answers on `{public_id}.{DOMAIN}`, so the domain carries a wildcard DNS record for `*.{host}` and a certificate covering it, and the wildcard is added to the Vercel project. Nothing in code makes `www` special, so it gets the same 404 as any other label naming no project and pointing it back at the app is a redirect on the domain itself. A deployment answering on a host outside that wildcard, a Vercel preview among them, serves the app normally and can serve no mock at all, which is why a mock is verified locally at `{public_id}.localhost:3000` or on production.
- **A project id has to be reissued once per database**: `ProjectPublicIdSchema` refuses an id carrying uppercase, because the id is a hostname label and DNS folds case. A row written before that rule is unreachable, in the app and as a mock alike, and `npm run prisma:reissue-project-public-id` gives every such row a new id, with `--dry-run` to list them first. A lowercase id is valid to both this code and the code before it, so the script is safe to run ahead of the deployment and leaves nothing to do afterwards.
