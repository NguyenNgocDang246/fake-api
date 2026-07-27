# src/server/middlewares — Agent Guide

## Summary

Request-level middleware functions invoked from the Next.js middleware entry point (`src/middleware.ts`). Not domain services.

## Content

- `auth.middleware.ts` — `authMiddleware({ req, ctx, isApiRoute })`. Tries the `access_token` cookie first via `token.service.ts#verifyAccessToken`; on failure/absence falls back to `refresh_token`, re-validates the user's `token_version` still matches, mints a new access token, and stashes it on `ctx.refreshedAccessToken` (the cookie itself is set by the caller, not here) plus `ctx.userId`. Returns `null` to continue, or an `ApiResponse.error` (401) only when `isApiRoute` and both tokens failed.
- `fake.middleware.ts` — `fakeMiddleware(req, public_id)`. Validates `public_id` against `PUBLIC_ID_REGEX`; on match, rewrites the request to `${FakeAPIPrefix}${public_id}` (`/api/fake/:publicId`) via `NextResponse.rewrite`. Exports `FakeAPIPrefix` so the orchestrator can recognize already-rewritten requests.

## Conventions

- Every middleware function returns either `null` (continue) or a `NextResponse` (short-circuit: a rewrite or an `ApiResponse.error`) — this is what lets `src/middleware.ts` chain them with simple `if (result) return result;` checks.
- A middleware never sets cookies/headers on the response itself; it only mutates the shared `ctx: MiddlewareContext` object or returns a short-circuit response, and the orchestrator (`src/middleware.ts`) applies `ctx` to the final response.

Naming, ID, and other conventions that also apply outside this directory are in [src/server/AGENTS.md](../AGENTS.md) and the root [AGENTS.md](../../../AGENTS.md).
