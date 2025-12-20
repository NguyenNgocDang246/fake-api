export type MockHeadersInit = Record<string, string | undefined>;

export function createHeaders(init: MockHeadersInit = {}) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(init)) {
    if (value !== undefined) headers.set(key, value);
  }
  return headers;
}

export function createJsonRequest<T>(
  body: T,
  {
    headers = {},
    pathname,
  }: {
    headers?: MockHeadersInit;
    pathname?: string;
  } = {}
) {
  const req: any = {
    headers: createHeaders(headers),
    async json() {
      return body;
    },
  };

  if (pathname) {
    req.nextUrl = { pathname };
  }

  return req;
}

export function createThrowingJsonRequest(
  error: unknown = new Error("Invalid JSON"),
  {
    headers = {},
    pathname,
  }: {
    headers?: MockHeadersInit;
    pathname?: string;
  } = {}
) {
  const req: any = {
    headers: createHeaders(headers),
    async json() {
      throw error;
    },
  };

  if (pathname) {
    req.nextUrl = { pathname };
  }

  return req;
}

export async function readJson(res: any) {
  return await res.json();
}

export async function expectSuccess(res: any, status = 200) {
  expect(res.status).toBe(status);
  if (status === 204) return;
  const body = await readJson(res);
  expect(body).toHaveProperty("status", "success");
}

export async function expectError(res: any, status: number, message?: string) {
  expect(res.status).toBe(status);
  if (status === 204) return;
  const body = await readJson(res);
  expect(body).toHaveProperty("status", "error");
  if (message !== undefined) expect(body).toHaveProperty("message", message);
}

