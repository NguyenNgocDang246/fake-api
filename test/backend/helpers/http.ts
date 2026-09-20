import type { NextRequest, NextResponse } from "next/server";

export type MockHeadersInit = Record<string, string | undefined>;

export function createHeaders(init: MockHeadersInit = {}) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(init)) {
    if (value !== undefined) headers.set(key, value);
  }
  return headers;
}

interface MockRequestInit {
  headers?: MockHeadersInit;
  pathname?: string;
}

export function createJsonRequest<T>(body: T, init: MockRequestInit = {}): NextRequest {
  const { headers = {}, pathname } = init;
  // Both readers, and agreeing with each other: a route may size the body with `text()` before
  // parsing it, and a mock that only answers `json()` would make that route untestable.
  const req = {
    headers: createHeaders(headers),
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
    ...(pathname ? { nextUrl: { pathname } } : {}),
  };
  return req as unknown as NextRequest;
}

export function createThrowingJsonRequest(
  error: unknown = new Error("Invalid JSON"),
  init: MockRequestInit = {}
): NextRequest {
  const { headers = {}, pathname } = init;
  const req = {
    headers: createHeaders(headers),
    async json() {
      throw error;
    },
    async text() {
      throw error;
    },
    ...(pathname ? { nextUrl: { pathname } } : {}),
  };
  return req as unknown as NextRequest;
}

// The second argument a `createRouteHandler` export takes. One resolved promise is reused across
// calls, which is all the handler ever does with it.
export function createRouteParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

// The default keeps what `res.json()` already hands back, so every existing caller reads the
// envelope exactly as before. A caller that wants a field typed names the shape instead.
export async function readJson<T = Awaited<ReturnType<NextResponse["json"]>>>(
  res: NextResponse
): Promise<T> {
  return (await res.json()) as T;
}

export async function expectSuccess(res: NextResponse, status = 200) {
  expect(res.status).toBe(status);
  if (status === 204) return;
  const body = await readJson(res);
  expect(body).toHaveProperty("status", "success");
}

export async function expectError(res: NextResponse, status: number, message?: string) {
  expect(res.status).toBe(status);
  if (status === 204) return;
  const body = await readJson(res);
  expect(body).toHaveProperty("status", "error");
  if (message !== undefined) expect(body).toHaveProperty("message", message);
}
