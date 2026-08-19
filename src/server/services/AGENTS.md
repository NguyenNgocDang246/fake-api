# src/server/services — Agent Guide

## Summary

Business logic layer. One domain per file, except `auth/` and `mail/` which are folders (grouping only, not a layering rule) because each has more than one internal concern.

## Content

### Single-file services

- `user.service.ts` — CRUD on `users` (`getAllUsers`, `createUser`, `getUserById`, `getUserByEmail`, `verifyUserEmail`, `updatePassword`, `increaseTokenVersion`). `increaseTokenVersion` is the token-revocation primitive used by `auth/`.
- `project.service.ts`, `endpoint_group.service.ts`, `endpoint.service.ts` — CRUD scoped to a user/project, plus role-limit checks before create. Read the file directly, no further doc needed.
- `endpoint.service.ts` also resolves incoming fake-API requests to a stored endpoint row: `getEndpointByPath` is an exact literal match (tried first, from `src/app/api/fake/[projectId]/route.ts`); `getEndpointByDynamicPath` is the fallback, matching `:paramName` segments in `path` (e.g. `/user/:id`) via the pure `matchPathTemplate(template, pathname)` helper. Static match always wins — dynamic is only attempted when the exact lookup returns nothing.

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
