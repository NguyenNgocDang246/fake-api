# src/server/services — Agent Guide

## Summary

Business logic layer. One domain per file, except `ai/`, `auth/`, `endpoint/` and `mail/` which are folders (grouping only, not a layering rule) because each has more than one internal concern.

## Content

### Single-file services

- `user.service.ts` — CRUD on `users` (`getAllUsers`, `createUser`, `getUserById`, `getUserByEmail`, `verifyUserEmail`, `updatePassword`, `increaseTokenVersion`). `increaseTokenVersion` is the token-revocation primitive used by `auth/`.
- `project.service.ts`, `endpoint_group.service.ts` — CRUD scoped to a user/project, plus role-limit checks before create. Read the file directly, no further doc needed.
- `ai_usage.service.ts` — the append-only record of model calls a user has spent, which the per-role daily quota counts. `trySpend` is the one a caller about to reach a model uses: it counts and records inside a single transaction behind a row lock on the user, so concurrent designs cannot all pass the same check. `record` is the bare insert, and `isAiAllowed` answers the different question of whether the role has any AI at all, which is what the endpoint routes refuse `ai_enabled` on. `quotaFor` is the read behind the quota badge in the AI card: it reports `{limit, spent}` with a plain `count`, deliberately without the lock or the transaction, since nothing is being claimed and `trySpend` remains the only thing that decides. It sits here rather than in `ai/` because that directory may not import anything from the domain and this file knows about users and roles.

### `endpoint/` — endpoints and the blueprint behind their AI variants

See [endpoint/AGENTS.md](endpoint/AGENTS.md) for endpoint CRUD and the path resolution that answers a fake-API request, and [endpoint/variant/AGENTS.md](endpoint/variant/AGENTS.md) for the blueprint a model designs once so faker can render a different response body on every call.

### `ai/` — shared LLM infrastructure

See [ai/AGENTS.md](ai/AGENTS.md). It deliberately knows nothing about endpoints, so a future chatbox can reuse it as is. Everything endpoint-specific (prompt text, path extraction, blueprint validation) lives in `endpoint/`, not in `ai/`.

### `auth/` — split into three files by responsibility

- `auth.service.ts` — orchestration only (`register`, `registerWithGoogle`, `login`, `loginWithGoogle`, `updatePassword`). Delegates persistence to `user.service.ts`, hashing to `hash.service.ts`, token minting to `token.service.ts`, verification email to `mail/mail.service.ts`.
- `hash.service.ts` — thin `argon2` wrapper (`hashPassword`, `verifyPassword`). No error handling of its own.
- `auth.constants.ts` — the expiration constant of each of the four token types (both as seconds for cookie `maxAge` and as a string duration for `jose`), plus `AUTH_MESSAGES`, `GOOGLE_AUTH_MESSAGES` and `TOKEN_MESSAGE`. Literals and enums only: `src/middleware.ts` imports from it on the Edge runtime, so it must never pull in Prisma, `jose` or a service.
- `token.service.ts` — all JWT lifecycle logic (`jose`). Four independent token types, each with its own secret and expiration constant: access/refresh (session), reset-password (forgot-password flow), verify-email (registration/resend). Every `verify*` method throws `AppError` with a `TOKEN_MESSAGE.INVALID_EXPIRED_*` message, never the raw `jose` error.

`token_version` on the `users` row is the revocation mechanism: refresh/reset/verify tokens embed it, and `increaseTokenVersion` invalidates every outstanding token of that type in one write. A token is only "valid" if both its own expiration *and* the `token_version` check pass.

To add a new token type: mirror `createResetPasswordToken`/`verifyResetPasswordToken` — new secret, new expiration pair, new payload schema, new `create*`/`verify*` pair in `token.service.ts`.

### `mail/` — mail sending + templates

- `mail.service.ts` — wraps the `Resend` client. `sendEmail({ to, subject, html })` is the generic primitive; `sendVerificationEmail`/`sendForgotPasswordEmail` are the higher-level call sites used from `auth.service.ts`. Each renders a template and builds a link containing a token from `token.service.ts`.
  - The `@react-email/render` dependency exists only to satisfy `resend`'s optional peer dependency. `resend` dynamic-imports it inside its own `render()`, and Turbopack resolves that specifier at build time even though the code path is never taken. Nothing here imports it: `sendEmail` always passes a pre-rendered `html` string, never `react:`. Do not prune it as unused, the build fails with `Module not found: Can't resolve '@react-email/render'` without it.
- `mail_template/<name>/` — one folder per email, two files each: `<name>_template.ts` (raw HTML with `{{placeholder}}` markers) and `<name>.ts` (`render<Name>Template(props)`, regex-replaces `{{key}}` → `props[key]`). No templating engine; placeholder names must match the props interface exactly.

To add a new email: add a `mail_template/<name>/` pair (follow `verify_email/` as reference), add a `send<Name>Email` method to `mail.service.ts`, wrap it in the standard `AppError` try/catch.

## Conventions

- **Error normalization**: every method in every service funnels its persistence call through `guardService` (`../core/errors.ts`), which normalizes every thrown value into a single `AppError`. `project.service.ts`, `user.service.ts` and `endpoint_group.service.ts` still spell that try/catch out by hand; they mean the same thing and are the ones left to convert.
- **Two services opt out of it, and say so.** `endpoint/variant/plan.service.ts` and `endpoint/variant/faker.service.ts` swallow rather than normalize: `ensurePlan` and `adoptPlan` are always run from `after()`, where a thrown error reaches nobody, and `renderVariant` answers `null` so the fake route falls back to the base body. Anything else that runs past the response or on the serving path has the same duty, and has to be as explicit about it.
- **Default list ordering**: every `findMany` that lists rows for a client orders by `{ updated_at: "desc" }` (most recently updated first). `updated_at` is a Prisma `@updatedAt` column on all four models, auto-set on create/update.
- **Rows are addressed externally by `public_id`.** The one exception is `ai_usage_logs`, an append-only counter that never appears in a URL or an API response and is only ever aggregated; any table that *is* addressed externally still gets a `public_id`.
