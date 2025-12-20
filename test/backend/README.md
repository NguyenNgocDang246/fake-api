# Backend Test Flow

## Purpose
Ensure API routes (`src/app/api/**/route.ts`) and backend services (`src/server/services/**`) behave correctly without hitting real DB/network.

## How tests run
1) **Runner**: `npm run test:backend` (uses `test/backend/run-jest.cjs` to start Jest).
2) **Transforms**: `ts-jest` compiles TypeScript using `test/backend/tsconfig.jest.json` (ES2020 target for BigInt).
3) **Setup**: `test/backend/jest.setup.ts` runs before tests to mock NextResponse, cookies, webstorage, and seed env defaults.
4) **Execution**: Jest loads specs under `test/backend/routes/**` and `test/backend/services/**`.
5) **Assertion helpers**: `test/backend/helpers/http.ts` provides request builders and response matchers (`expectSuccess`, `expectError`).

## Running tests
- All backend tests: `npm run test:backend`
- Filter by pattern: `npm run test:backend -- --testPathPatterns "<pattern>"`
- Run a single file (example): `npm run test:backend -- --testPathPatterns "auth/login.route.test.ts"`

## Project layout for tests
- `test/backend/routes/**` — tests for each API route handler
- `test/backend/services/**` — tests for each backend service/module
- `test/backend/helpers/http.ts` — common request/response utilities
- `test/backend/jest.setup.ts` — global mocks and env defaults
- `test/backend/.jest-localstorage/` — Node webstorage artifacts (git-ignored)

## Mocking expectations
- Next: `next/server` (NextResponse), `next/headers` (cookies)
- Prisma: mock `src/server/prisma/prisma_provider.ts`
- Auth/Mail/Hash: mock `token.service`, `mail.service`, `hash.service`
- Google OAuth: mock `googleapis` + `getOauth2Client`
- Webstorage: localStorage/sessionStorage mocked in setup to silence Node webstorage warnings

## Writing a new test (happy path)
1) Import the route/service function and necessary mocks.
2) Arrange input via helper `createJsonRequest` (routes) or direct args (services).
3) Mock dependencies (Prisma/service calls) for expected behavior.
4) Call the target function; assert status/body via `expectSuccess`/`expectError`.
5) Cover negative paths: validation fails, permission/auth fails, AppError vs generic error, 204 responses.

## Coverage checklist
- Routes: happy path, validation errors, auth/permission errors, AppError vs generic errors, headers/cookies/redirects, 204 body null.
- Services: success, edge inputs, dependency throws, AppError wrapping/propagation.
- Schemas with `.strict()`: include “extra field” cases.
- Fake API: NOT_FOUND, METHOD_NOT_ALLOWED, validation failure, `delay_ms` with fake timers.
