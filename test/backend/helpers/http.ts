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
  const req = {
    headers: createHeaders(headers),
    async json() {
      return body;
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
    ...(pathname ? { nextUrl: { pathname } } : {}),
  };
  return req as unknown as NextRequest;
}

export async function readJson(res: NextResponse) {
  return await res.json();
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
