import { NextResponse } from "next/server";

export type MockCorsConfig = {
  cors_enabled: boolean;
  cors_origins: string[];
  cors_allow_credentials: boolean;
};

// Fixed rather than derived from the endpoints a project happens to hold. A preflight for a path
// nobody has created yet still has to pass, so the real request gets through and answers with a
// 404 the browser can read instead of an opaque CORS failure.
export const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
export const PREFLIGHT_MAX_AGE = 600;
const DEFAULT_ALLOWED_HEADERS = "Content-Type, Authorization";

// What every mock answers with before its own headers are layered on top. `no-store` is the one
// that earns its place: bodies are edited constantly, and an endpoint with AI variants answers
// differently every call, both of which a cached GET quietly breaks.
export const DEFAULT_MOCK_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

// The CORS safelist already lets a browser read content-type, cache-control and their neighbours,
// so only the ones it would otherwise hide are worth naming here.
const BASE_EXPOSE_HEADERS = ["ETag", "Location", "Retry-After"];

function matchOrigin(allowed: string[], origin: string): boolean {
  const lower = origin.toLowerCase();
  return allowed.some((candidate) => candidate.toLowerCase() === lower);
}

// Returns the headers to merge onto the response, or null when this caller gets none, which is
// what makes the browser block it. Null covers both "CORS turned off" and "origin not on the list".
export function buildCorsHeaders({
  config,
  origin,
  preflight,
  requestedHeaders = null,
  exposeHeaders = [],
}: {
  config: MockCorsConfig;
  origin: string;
  preflight: boolean;
  requestedHeaders?: string | null;
  exposeHeaders?: string[];
}): Headers | null {
  if (!config.cors_enabled) return null;

  const restricted = config.cors_origins.length > 0;
  if (restricted && !matchOrigin(config.cors_origins, origin)) return null;

  const headers = new Headers();

  // Credentials and a wildcard origin are a pair no browser accepts, and the project schema
  // already refuses to store that combination, so echoing the origin is always the right move.
  if (restricted || config.cors_allow_credentials) {
    headers.set("access-control-allow-origin", origin);
    headers.append("vary", "Origin");
  } else {
    headers.set("access-control-allow-origin", "*");
  }

  if (config.cors_allow_credentials) {
    headers.set("access-control-allow-credentials", "true");
  }

  if (preflight) {
    headers.set("access-control-allow-methods", ALLOWED_METHODS);
    // Echoed rather than enumerated, so a caller sending X-Api-Key or Authorization never has to
    // declare it in the project first.
    headers.set("access-control-allow-headers", requestedHeaders || DEFAULT_ALLOWED_HEADERS);
    headers.set("access-control-max-age", String(PREFLIGHT_MAX_AGE));
    if (requestedHeaders) headers.append("vary", "Access-Control-Request-Headers");
    return headers;
  }

  // Without this a header reaches the browser but `res.headers.get(...)` still reads null, which
  // is the whole point of letting an endpoint set one.
  const expose = [...new Set([...BASE_EXPOSE_HEADERS, ...exposeHeaders])];
  headers.set("access-control-expose-headers", expose.join(", "));

  return headers;
}

export function applyCorsHeaders(res: NextResponse, cors: Headers | null): NextResponse {
  if (!cors) return res;

  cors.forEach((value, key) => {
    if (key === "vary") res.headers.append(key, value);
    else res.headers.set(key, value);
  });

  return res;
}
