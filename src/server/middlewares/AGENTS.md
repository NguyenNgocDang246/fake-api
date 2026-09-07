# src/server/middlewares — Agent Guide

## Summary

Request-level middleware functions invoked from the Next.js middleware entry point (`src/middleware.ts`). Not domain services.

## Content

- `auth.middleware.ts` — `authMiddleware({ req, ctx, isApiRoute })`. Tries the `access_token` cookie first via `token.service.ts#verifyAccessToken`; on failure/absence falls back to `refresh_token`, re-validates the user's `token_version` still matches, mints a new access token, and stashes it on `ctx.refreshedAccessToken` (the cookie itself is set by the caller, not here) plus `ctx.userId`. Returns `null` to continue, or an `ApiResponse.error` (401) only when `isApiRoute` and both tokens failed.
- `guest.middleware.ts` — `guestMiddleware(req)`. Recognizes the `GUEST_PROXY_PREFIX` (`/api/guest/project/`) and rewrites onto the real `/api/project/**` handlers with `x-userId` set to the shared guest account, so a visitor with no session reaches the same endpoint CRUD code every signed-in user does. It accepts exactly two path shapes, `{projectId}/endpoint-group/{groupId}/endpoint` and that plus `/{endpointId}`, with every id checked against `PUBLIC_ID_REGEX`; everything else under the prefix is a 404. That whitelist is the whole security boundary of the branch: it is what keeps project rename/delete and group CRUD out of reach of an unauthenticated caller. It builds a fresh `Headers` and deletes any `x-userId`/`x-role` the client sent before setting its own, because this branch never ran `authMiddleware` and the request's own headers are forwarded verbatim by `NextResponse.rewrite(url, {request: {headers}})`.
- `fake.middleware.ts` — `fakeMiddleware(req, public_id)`. Validates `public_id` against `PUBLIC_ID_REGEX`; on match, rewrites the request to `${FakeAPIPrefix}${public_id}` (`/api/fake/:publicId`) via `NextResponse.rewrite`. Exports `FakeAPIPrefix` so the orchestrator can recognize already-rewritten requests.

## Conventions

- Every middleware function returns either `null` (continue) or a `NextResponse` (short-circuit: a rewrite or an `ApiResponse.error`) — this is what lets `src/middleware.ts` chain them with simple `if (result) return result;` checks.
- A middleware never sets cookies/headers on the response itself; it only mutates the shared `ctx: MiddlewareContext` object or returns a short-circuit response, and the orchestrator (`src/middleware.ts`) applies `ctx` to the final response. `guest.middleware.ts` is the exception and returns its own rewrite carrying its own request headers, because it names a user without `ctx` and without `authMiddleware` ever running.
- A branch that skips `authMiddleware` owns its identity end to end, which includes deleting the `x-userId`/`x-role` a client may have put on the wire. `NextResponse.next`/`rewrite` forward the request's headers as they stand, so anything not deleted reaches `withUserId` as if middleware had set it.

Naming, ID, and other conventions that also apply outside this directory are in [src/server/AGENTS.md](../AGENTS.md) and the root [AGENTS.md](../../../AGENTS.md).
