import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_ID_REGEX } from "@/app/libs/helpers/publicId";
import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";

const FAKE_API_PREFIX = "/api/fake/";

// One DOMAIN decides both the app host and the mock suffix, so the two cannot drift apart.
// `||`, not `??`: an empty env var has to fall back too, or `new URL("")` throws at module load
// and takes every request down with it.
const APP_URL = new URL(process.env["DOMAIN"] || "http://localhost:3000");
const MOCK_HOST_SUFFIX = `.${APP_URL.host.toLowerCase()}`;

// A trailing dot and a default port still name the same host, so both are dropped before the
// suffix check or they would carry a mock host past it and serve the app there.
export function requestHost(req: NextRequest): string {
  const raw = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const first = (raw.split(",")[0] ?? "").trim().toLowerCase();
  const [, name = "", port] = /^(.*?)(?::(\d+))?$/.exec(first) ?? [];
  const hostname = name.replace(/\.$/, "");
  const isDefaultPort = APP_URL.port === "" && (port === "80" || port === "443");
  return port === undefined || isDefaultPort ? hostname : `${hostname}:${port}`;
}

function notFound() {
  return ApiResponse.error({
    message: ERROR_MESSAGES.NOT_FOUND,
    statusCode: STATUS_CODE.NOT_FOUND,
  });
}

// Null lets the request through to the app. Every host under the wildcard is mock territory,
// `www` included, so a label naming no project is a 404 rather than a second copy of the app.
const fakeMiddleware = (req: NextRequest) => {
  const host = requestHost(req);

  if (!host.endsWith(MOCK_HOST_SUFFIX)) {
    // A rewrite never runs middleware again, so the fake route seen here was called directly.
    return req.nextUrl.pathname.startsWith(FAKE_API_PREFIX) ? notFound() : null;
  }

  const label = host.slice(0, -MOCK_HOST_SUFFIX.length);
  if (!PUBLIC_ID_REGEX.test(label)) return notFound();

  // Only the id goes on the rewritten URL. The route handler reads the mock path off the
  // original `req.nextUrl.pathname`, which a rewrite leaves as the caller wrote it.
  const newUrl = req.nextUrl.clone();
  newUrl.pathname = `${FAKE_API_PREFIX}${label}`;
  return NextResponse.rewrite(newUrl);
};

export default fakeMiddleware;
