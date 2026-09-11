import { after, NextRequest, NextResponse } from "next/server";
import ApiResponse from "@/server/core/api_response";
import EndpointService from "@/server/services/endpoint/endpoint.service";
import projectService from "@/server/services/project.service";
import endpointVariantPlanService, {
  PlanEndpoint,
} from "@/server/services/endpoint/variant/plan.service";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import {
  EndpointMethod,
  EndpointResponseSchema,
  getEndpointByPathSchema,
  isBlockedHeader,
} from "@/models/endpoint/endpoint.model";
import { validateData } from "@/server/core/validation";
import { createStaticRouteHandler, withErrorHandling } from "@/server/core/route_helpers";
import {
  ALLOWED_METHODS,
  DEFAULT_MOCK_HEADERS,
  applyCorsHeaders,
  buildCorsHeaders,
} from "@/server/core/cors";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The rewrite in `fake.middleware.ts` drops everything past the id, so the original pathname is
// what every reader here works from.
function segmentsOf(req: NextRequest): string[] {
  const rawPathname = req.nextUrl.pathname.split(/[?#]/)[0] ?? "";
  return rawPathname.split("/").filter(Boolean);
}

// Either a whole string literal, which is kept as it is, or a run of whitespace outside one.
const JSON_TOKEN = /("(?:\\.|[^"\\])*")|[ \t\n\r]+/g;

// The whitespace the editor wrote is dropped without a parse, so key order and number literals
// reach the client exactly as the author stored them.
function compactJson(text: string): string {
  return text.replace(JSON_TOKEN, (_match, stringLiteral) => stringLiteral ?? "");
}

async function handle(req: NextRequest, method: EndpointMethod["method"]) {
  const segments = segmentsOf(req);
  const publicId = segments[0];
  if (!publicId)
    return ApiResponse.error({
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: STATUS_CODE.NOT_FOUND,
    });
  const pathname = "/" + segments.slice(1).join("/");

  const pathValidation = validateData({ path: pathname, method }, getEndpointByPathSchema);
  if (!pathValidation.success)
    return ApiResponse.error({
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: STATUS_CODE.NOT_FOUND,
    });

  let endpoint = await EndpointService.getEndpointByPath({
    project_public_id: publicId,
    ...pathValidation.data,
  });
  if (!endpoint) {
    endpoint = await EndpointService.getEndpointByDynamicPath({
      project_public_id: publicId,
      ...pathValidation.data,
    });
  }
  if (!endpoint) {
    const allow = await EndpointService.findMethodsForPath({
      project_public_id: publicId,
      path: pathname,
    });
    if (allow.length > 0) {
      const response = ApiResponse.error({
        message: ERROR_MESSAGES.METHOD_NOT_ALLOWED,
        statusCode: STATUS_CODE.METHOD_NOT_ALLOWED,
        errors: { allow },
      });
      response.headers.set("allow", allow.join(", "));
      return response;
    }

    return ApiResponse.error({
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: STATUS_CODE.NOT_FOUND,
    });
  }

  const endpointValidation = validateData(
    {
      method: endpoint.method,
      path: endpoint.path,
      status_code: endpoint.status_code,
      response_body: endpoint.response_body,
      response_headers: endpoint.response_headers,
      delay_ms: endpoint.delay_ms,
    },
    EndpointResponseSchema
  );
  if (!endpointValidation.success) return endpointValidation.response;
  const validEndpoint = endpointValidation.data;
  await sleep(validEndpoint.delay_ms || 0);

  const headers = mockHeaders(validEndpoint.response_headers);

  // A 204 still carries headers, and `Location` on one is the reason an author sets any.
  if (validEndpoint.status_code == STATUS_CODE.NO_CONTENT) {
    headers.delete("content-type");
    return new NextResponse(null, { status: STATUS_CODE.NO_CONTENT, headers });
  }

  const body = await resolveBody(endpoint, validEndpoint.response_body);

  // Only whitespace is stripped, never handed to `NextResponse.json`, so the bytes the author
  // typed are the bytes the client reads. Rebuilding them through a parse is what loses a large
  // integer's precision and reorders integer-like keys.
  return new NextResponse(compactJson(body), {
    status: validEndpoint.status_code || STATUS_CODE.OK,
    headers,
  });
}

// `set` rather than `append`, and `Headers` matches names case-insensitively, so an endpoint
// declaring `Content-Type: text/plain` replaces the default instead of sitting beside it. The
// blocklist runs again here because a row stored before those rules never passed through them.
function mockHeaders(stored: { name: string; value: string }[]): Headers {
  const headers = new Headers(DEFAULT_MOCK_HEADERS);

  for (const { name, value } of stored) {
    if (isBlockedHeader(name)) continue;
    headers.set(name, value);
  }

  return headers;
}

// Returns JSON text: the stored body verbatim on every path that serves it, a rendered variant
// stringified. The dynamic import sits past both guards so an endpoint with no blueprint never
// loads faker's locale datasets, and its specifier is a literal so the bundler can trace it.
async function resolveBody(endpoint: PlanEndpoint, baseBody: unknown): Promise<string> {
  if (!endpoint.ai_enabled || endpoint.ai_fields.length === 0) return endpoint.response_body;

  try {
    const renderable = endpointVariantPlanService.loadRenderable(endpoint);

    if (!renderable) {
      after(async () => {
        try {
          await endpointVariantPlanService.ensurePlan(endpoint);
        } catch (error) {
          console.error("[ai] post-response blueprint work failed", {
            endpoint_id: String(endpoint.id),
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      });
      return endpoint.response_body;
    }

    const [{ renderVariant }, { parseJsonSource, emitFromSource }] = await Promise.all([
      import("@/server/services/endpoint/variant/faker.service"),
      import("@/server/services/endpoint/variant/json_source"),
    ]);

    // Rendered against the source parse rather than the one Zod already did, so the tree the
    // literals are read back from is the very tree the draft was cloned from.
    const source = parseJsonSource(endpoint.response_body);

    // The unique-catalog set comes off the cached blueprint rather than being walked again:
    // it is a property of the blueprint, not of the request.
    const rendered = renderVariant(renderable.plan, source ? source.value : baseBody, {
      uniqueCatalogs: renderable.uniqueCatalogs,
    });
    if (rendered === null) return endpoint.response_body;
    return source ? emitFromSource(rendered, source) : JSON.stringify(rendered);
  } catch (error) {
    console.error("[ai] falling back to base body", { path: endpoint.path, error });
    return endpoint.response_body;
  }
}

// Everything a browser can read without being told to. Whatever else the response ended up
// carrying, an endpoint's own headers and `Allow` on a 405, is what gets named to the browser.
const SAFELISTED_HEADERS = new Set([
  "cache-control",
  "content-language",
  "content-length",
  "content-type",
  "expires",
  "last-modified",
  "pragma",
  "vary",
]);

function exposableHeaders(res: NextResponse): string[] {
  return [...res.headers.keys()].filter(
    (name) => !SAFELISTED_HEADERS.has(name) && !name.startsWith("access-control-")
  );
}

// CORS has to cover every answer, the 404s and 405s included: a response without these headers
// reaches the browser as an opaque failure, hiding the status that would have explained it.
function mockRoute(method: EndpointMethod["method"]) {
  return createStaticRouteHandler(async (req) => {
    const guarded = withErrorHandling(handle);
    const origin = req.headers.get("origin");
    // No Origin means curl, Postman or a server calling. Nothing to negotiate, nothing to look up.
    if (!origin) return guarded(req, method);

    const publicId = segmentsOf(req)[0];
    if (!publicId) return guarded(req, method);

    const config = await projectService.getCorsConfig({ public_id: publicId });
    const res = await guarded(req, method);
    if (!config) return res;

    return applyCorsHeaders(
      res,
      buildCorsHeaders({
        config,
        origin,
        preflight: false,
        exposeHeaders: exposableHeaders(res),
      })
    );
  });
}

export const GET = mockRoute("GET");
export const POST = mockRoute("POST");
export const PUT = mockRoute("PUT");
export const PATCH = mockRoute("PATCH");
export const DELETE = mockRoute("DELETE");

// Answers from the project's CORS settings alone: no endpoint lookup, no `delay_ms`, no variant
// rendering. A preflight is the browser asking whether it may call, not a call.
export const OPTIONS = createStaticRouteHandler(async (req) => {
  const publicId = segmentsOf(req)[0];
  const origin = req.headers.get("origin");

  if (!publicId)
    return ApiResponse.error({
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: STATUS_CODE.NOT_FOUND,
    });

  const response = new NextResponse(null, { status: STATUS_CODE.NO_CONTENT });
  response.headers.set("allow", ALLOWED_METHODS);
  if (!origin) return response;

  const config = await projectService.getCorsConfig({ public_id: publicId });
  if (!config)
    return ApiResponse.error({
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: STATUS_CODE.NOT_FOUND,
    });

  return applyCorsHeaders(
    response,
    buildCorsHeaders({
      config,
      origin,
      preflight: true,
      requestedHeaders: req.headers.get("access-control-request-headers"),
    })
  );
});
