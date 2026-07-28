# src/server/core — Agent Guide

## Summary

Cross-cutting utilities shared by every service. Not domain-specific.

## Content

- `api_response.ts` — `ApiResponse` class, static `success({ data, statusCode })` / `error({ errors, message, statusCode })`. `error` special-cases `STATUS_CODE.NO_CONTENT` to return a body-less `NextResponse`. Both build the `ApiResponseModel` envelope from `src/models/api_response.model`.
- `errors.ts` — `AppError` (extends `Error`, carries `statusCode` + `message`, defaults to `SERVER_ERROR`/500) and `ErrorValidation` (`{ message, field }`, built via `ErrorValidation.fromZodError(zodError)` which maps each Zod issue to one instance).
- `validation.ts` — `validateData(data, schema)`. Overloaded: pass a bare `ZodSchema` or a single-element tuple `[schema]` to force array validation. Returns `{ success: true, data }` or `{ success: false, response }` where `response` is a ready-made `ApiResponse.error` with `VALIDATION_FAILED` + 400.
- `constants.ts` — token expiration constants (access/refresh/reset-password/verify-email, both as seconds and string durations for `jose`), and the enums `ERROR_MESSAGES`, `SUCCESS_MESSAGES`, `RESPONSE_STATUS`, `STATUS_CODE`, `AUTH_MESSAGES`, `GOOGLE_AUTH_MESSAGES`, `ENDPOINT_MESSAGES`, `LIMIT_MESSAGES`, `TOKEN_MESSAGE`. All user-facing strings and HTTP status codes live here, nowhere else.
- `prisma_retry.ts` — `createWithUniquePublicId(createFn)`: calls `createFn(generatePublicId())` up to 5 times, retrying only on a Prisma `P2002` unique-constraint violation targeting `public_id`; any other error rethrows immediately.
- `role_limits.ts` — `ROLE_LIMITS`: a `Record<UserRole, {maxProjects, maxGroupsPerProject, maxEndpointsPerGroup}>` (`GUEST`/`USER`/`USER_VIP`), consulted before creating projects/groups/endpoints.
- `route_helpers.ts` — composable pieces for `route.ts` handlers: `withErrorHandling(handler)` wraps a handler in the standard try/catch (`AppError` → its own message/statusCode, else generic `ApiResponse.error()`). `createRouteHandler<T>(chain)` adapts a `ChainHandler` into a Next.js route export, awaiting `props.params` once. `withUserId`/`withProjectId`/`withEndpointGroupId`/`withEndpointId` each validate one route param (via `validateData`) and add it to a shared `ctx: Record<string, string>`, short-circuiting with the validation's error response on failure — nest only the ones a given route actually needs (e.g. a project-only route just needs `withUserId(withProjectId(handler))`). Permission checks are intentionally NOT part of the chain: services' `checkPermission(s)` already re-verify the whole ancestor chain in one Prisma query, so call it once inside the innermost handler instead of once per chain level.

## Conventions

- New user-facing strings and HTTP status codes always go in `constants.ts` as enum members, never inlined at the call site.
- `validateData` is the only sanctioned way services parse untrusted input; it already returns a pre-built `ApiResponse.error`, so callers just return `result.response` on failure.

Naming, ID, and other conventions that also apply outside this directory are in [src/server/AGENTS.md](../AGENTS.md) and the root [AGENTS.md](../../../AGENTS.md).
