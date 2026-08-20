# src/server/services — Agent Guide

## Summary

Business logic layer. One domain per file, except `auth/` and `mail/` which are folders (grouping only, not a layering rule) because each has more than one internal concern.

## Content

### Single-file services

- `user.service.ts` — CRUD on `users` (`getAllUsers`, `createUser`, `getUserById`, `getUserByEmail`, `verifyUserEmail`, `updatePassword`, `increaseTokenVersion`). `increaseTokenVersion` is the token-revocation primitive used by `auth/`.
- `project.service.ts`, `endpoint_group.service.ts`, `endpoint.service.ts` — CRUD scoped to a user/project, plus role-limit checks before create. Read the file directly, no further doc needed.
- `endpoint.service.ts` also resolves incoming fake-API requests to a stored endpoint row: `getEndpointByPath` is an exact literal match (tried first, from `src/app/api/fake/[projectId]/route.ts`); `getEndpointByDynamicPath` is the fallback, matching `:paramName` segments in `path` (e.g. `/user/:id`) via the pure `matchPathTemplate(template, pathname)` helper. Static match always wins — dynamic is only attempted when the exact lookup returns nothing.
- `endpoint_variant.service.ts` — lifecycle of one endpoint's pool of AI generated response bodies: `pickVariant` (the least used row, so the pool is walked in order rather than sampled), `markVariantUsed`, `needsRefill`, `refillIfNeeded`, `clearVariants`, `prunePool`, and the per-role daily quota in `canGenerate`/`canRefill`. Serving a fake request only reads; counting a use and refilling are deferred to `after()` so an AI-enabled endpoint is no slower than a static one. `refillIfNeeded` never throws, because it runs once the response is already sent.
- `endpoint_variant_generator.service.ts` + `endpoint_variant_prompt.ts` — the bridge between the endpoint domain and `ai/`. The generator shrinks the body into prompt context, extracts the current value of every allowed path, validates each patch the model returns, and applies it to a clone of the base body. The prompt file holds the system prompt and the structured-output schema.

### `ai/` — shared LLM infrastructure

See [ai/AGENTS.md](ai/AGENTS.md). It deliberately knows nothing about endpoints, so a future chatbox can reuse it as is. Everything endpoint-specific (prompt text, path extraction, patch validation) lives in the two `endpoint_variant_*` files above, not in `ai/`.

### `auth/` — split into three files by responsibility

- `auth.service.ts` — orchestration only (`register`, `registerWithGoogle`, `login`, `loginWithGoogle`, `updatePassword`). Delegates persistence to `user.service.ts`, hashing to `hash.service.ts`, token minting to `token.service.ts`, verification email to `mail/mail.service.ts`.
- `hash.service.ts` — thin `argon2` wrapper (`hashPassword`, `verifyPassword`). No error handling of its own.
- `token.service.ts` — all JWT lifecycle logic (`jose`). Four independent token types, each with its own secret and expiration constant: access/refresh (session), reset-password (forgot-password flow), verify-email (registration/resend). Every `verify*` method throws `AppError` with a `TOKEN_MESSAGE.INVALID_EXPIRED_*` message, never the raw `jose` error.

`token_version` on the `users` row is the revocation mechanism: refresh/reset/verify tokens embed it, and `increaseTokenVersion` invalidates every outstanding token of that type in one write. A token is only "valid" if both its own expiration *and* the `token_version` check pass.

To add a new token type: mirror `createResetPasswordToken`/`verifyResetPasswordToken` — new secret, new expiration pair, new payload schema, new `create*`/`verify*` pair in `token.service.ts`.

### `mail/` — mail sending + templates

- `mail.service.ts` — wraps the `Resend` client. `sendEmail({ to, subject, html })` is the generic primitive; `sendVerificationEmail`/`sendForgotPasswordEmail` are the higher-level call sites used from `auth.service.ts`. Each renders a template and builds a link containing a token from `token.service.ts`.
  - The `@react-email/render` dependency exists only to satisfy `resend`'s optional peer dependency. `resend` dynamic-imports it inside its own `render()`, and Turbopack resolves that specifier at build time even though the code path is never taken. Nothing here imports it: `sendEmail` always passes a pre-rendered `html` string, never `react:`. Do not prune it as unused, the build fails with `Module not found: Can't resolve '@react-email/render'` without it.
- `mail_template/<name>/` — one folder per email, two files each: `<name>_template.ts` (raw HTML with `{{placeholder}}` markers) and `<name>.ts` (`render<Name>Template(props)`, regex-replaces `{{key}}` → `props[key]`). No templating engine; placeholder names must match the props interface exactly.

To add a new email: add a `mail_template/<name>/` pair (follow `verify_email/` as reference), add a `send<Name>Email` method to `mail.service.ts`, wrap it in the standard `AppError` try/catch.

## Conventions

- **Error normalization**: every method in every service wraps its body in `try { ... } catch (error) { throw error instanceof AppError ? error : new AppError(); }` — this normalizes every thrown value into a single `AppError` type.
- **Default list ordering**: every `findMany` that lists rows for a client orders by `{ updated_at: "desc" }` (most recently updated first). `updated_at` is a Prisma `@updatedAt` column on all four models, auto-set on create/update.
- **`endpoint_ai_variants` has no `public_id`**, the one exception to the project-wide ID rule. It is an internal cache that never appears in a URL or an API response, and a whole pool is written with a single `createMany`, which `createWithUniquePublicId` cannot do. Any table that *is* addressed externally still gets a `public_id`.
- **A variant pool rotates, it does not grow.** `refillIfNeeded` sizes a batch from `countUsableVariants` (rows still under `AI_VARIANT_MAX_USES`), never from the raw row count, or a full pool of worn out rows would look stocked and freeze forever. It generates the replacements first and lets `prunePool` drop the worn tail after, so the pool never dips to empty while the model is running and an endpoint stays capped at `AI_POOL_SIZE` rows for good.
- **Every path that spends tokens is quota checked.** The two routes a user clicks call `canGenerate`; the automatic refill calls `canRefill`, which resolves the owning user from the endpoint id and applies the same per-role daily limit.
- **The refill lock is written with `$executeRaw`, on purpose.** `endpoints.updated_at` carries `@updatedAt`, so touching `ai_refill_started_at` through Prisma would bump it and reorder the `updated_at desc` candidate list that `getEndpointByDynamicPath` uses to break ties between path templates. Raw SQL keeps the lock invisible to that ordering.
