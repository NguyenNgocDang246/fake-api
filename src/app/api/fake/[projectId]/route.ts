import { after, NextRequest, NextResponse } from "next/server";
import ApiResponse from "@/server/core/api_response";
import EndpointService, {
  servingScenarioOf,
} from "@/server/services/endpoint/endpoint.service";
import projectService from "@/server/services/project.service";
import endpointVariantPlanService, {
  PlanScenario,
} from "@/server/services/endpoint/variant/plan.service";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import {
  EndpointMethod,
  EndpointResponseSchema,
  MAX_MOCK_PATH_LENGTH,
  isBlockedHeader,
} from "@/models/endpoint/endpoint.model";
import { validateData } from "@/server/core/validation";
import { createRouteHandler, withErrorHandling } from "@/server/core/route_helpers";
import {
  ALLOWED_METHODS,
  DEFAULT_MOCK_HEADERS,
  LOCKED_MOCK_HEADERS,
  applyCorsHeaders,
  buildCorsHeaders,
} from "@/server/core/cors";
import { requestHost } from "@/server/middlewares/fake.middleware";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function notFound() {
  return ApiResponse.error({
    message: ERROR_MESSAGES.NOT_FOUND,
    statusCode: STATUS_CODE.NOT_FOUND,
  });
}

// The id arrives on the rewritten URL as the dynamic segment, so the whole original pathname is
// the mock path. Segments are decoded one at a time so an encoded `/` stays inside its own.
// Null for a path past the cap, measured before decoding, which only ever shortens it.
function mockPathname(req: NextRequest): string | null {
  const raw = req.nextUrl.pathname.split(/[?#]/)[0] ?? "";
  if (raw.length > MAX_MOCK_PATH_LENGTH) return null;
  return "/" + raw.split("/").filter(Boolean).map(decodeSegment).join("/");
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).replace(/\//g, "%2F");
  } catch {
    return segment;
  }
}

// Either a whole string literal, which is kept as it is, or a run of whitespace outside one.
const JSON_TOKEN = /("(?:\\.|[^"\\])*")|[ \t\n\r]+/g;

// The whitespace the editor wrote is dropped without a parse, so key order and number literals
// reach the client exactly as the author stored them.
function compactJson(text: string): string {
  return text.replace(JSON_TOKEN, (_match, stringLiteral) => stringLiteral ?? "");
}

async function handle(
  req: NextRequest,
  publicId: string,
  method: EndpointMethod["method"]
) {
  if (!publicId) return notFound();
  const path = mockPathname(req);
  if (path === null) return notFound();

  let endpoint = await EndpointService.getServableEndpointByPath({
    project_public_id: publicId,
    path,
    method,
  });
  if (!endpoint) {
    endpoint = await EndpointService.getServableEndpointByDynamicPath({
      project_public_id: publicId,
      path,
      method,
    });
  }
  if (!endpoint) {
    const allow = await EndpointService.findMethodsForPath({
      project_public_id: publicId,
      path,
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

    return notFound();
  }

  // Ordered rather than filtered, so the moment between a switch's two statements, when no
  // scenario is active, falls back to the first page instead of taking the mock down.
  const scenario = servingScenarioOf(endpoint);
  if (!scenario) return notFound();

  const endpointValidation = validateData(
    {
      method: endpoint.method,
      path: endpoint.path,
      status_code: scenario.status_code,
      response_body: scenario.response_body,
      response_headers: scenario.response_headers,
      delay_ms: scenario.delay_ms,
    },
    EndpointResponseSchema
  );
  if (!endpointValidation.success) return endpointValidation.response;
  const validEndpoint = endpointValidation.data;
  await sleep(validEndpoint.delay_ms || 0);

  const status = validEndpoint.status_code || STATUS_CODE.OK;
  const headers = mockHeaders(validEndpoint.response_headers);
  dropForeignRedirect(headers, status, requestHost(req));

  // A 204 still carries headers, and `Location` on one is the reason an author sets any.
  if (status == STATUS_CODE.NO_CONTENT) {
    headers.delete("content-type");
    return new NextResponse(null, { status: STATUS_CODE.NO_CONTENT, headers });
  }

  const body = await resolveBody(
    { ...scenario, method: endpoint.method, path: endpoint.path },
    validEndpoint.response_body
  );

  // Only whitespace is stripped, never handed to `NextResponse.json`, so the bytes the author
  // typed are the bytes the client reads. Rebuilding them through a parse is what loses a large
  // integer's precision and reorders integer-like keys.
  return new NextResponse(compactJson(body), { status, headers });
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
  for (const [name, value] of Object.entries(LOCKED_MOCK_HEADERS)) headers.set(name, value);

  return headers;
}

// A browser follows a 3xx by itself, so a Location off the mock's own host would make the
// project's subdomain an open redirect. Resolving it first is what catches `//evil.example`.
function dropForeignRedirect(headers: Headers, status: number, host: string) {
  const location = headers.get("location");
  if (status < 300 || status > 399 || location === null) return;
  if (!isOnHost(location, host)) headers.delete("location");
}

function isOnHost(location: string, host: string): boolean {
  try {
    return new URL(location, `http://${host}`).host === host;
  } catch {
    return false;
  }
}

// Returns JSON text: the stored body verbatim on every path that serves it, a rendered variant
// stringified. The dynamic import sits past both guards so an endpoint with no blueprint never
// loads faker's locale datasets, and its specifier is a literal so the bundler can trace it.
async function resolveBody(scenario: PlanScenario, baseBody: unknown): Promise<string> {
  if (!scenario.ai_enabled || scenario.ai_fields.length === 0) return scenario.response_body;

  try {
    const renderable = endpointVariantPlanService.loadRenderable(scenario);

    if (!renderable) {
      after(async () => {
        try {
          await endpointVariantPlanService.ensurePlan(scenario);
        } catch (error) {
          console.error("[ai] post-response blueprint work failed", {
            scenario_id: String(scenario.id),
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      });
      return scenario.response_body;
    }

    const [{ renderVariant }, { parseJsonSource, emitFromSource }] = await Promise.all([
      import("@/server/services/endpoint/variant/faker.service"),
      import("@/server/services/endpoint/variant/json_source"),
    ]);

    // Rendered against the source parse rather than the one Zod already did, so the tree the
    // literals are read back from is the very tree the draft was cloned from.
    const source = parseJsonSource(scenario.response_body);

    // The unique-catalog set comes off the cached blueprint rather than being walked again:
    // it is a property of the blueprint, not of the request.
    const rendered = renderVariant(renderable.plan, source ? source.value : baseBody, {
      uniqueCatalogs: renderable.uniqueCatalogs,
    });
    if (rendered === null) return scenario.response_body;
    return source ? emitFromSource(rendered, source) : JSON.stringify(rendered);
  } catch (error) {
    console.error("[ai] falling back to base body", { path: scenario.path, error });
    return scenario.response_body;
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
    (name) =>
      !SAFELISTED_HEADERS.has(name) &&
      // `hasOwn`, not `in`: `constructor` and `toString` are header names an author may pick.
      !Object.hasOwn(LOCKED_MOCK_HEADERS, name) &&
      !name.startsWith("access-control-")
  );
}

// CORS has to cover every answer, the 404s and 405s included: a response without these headers
// reaches the browser as an opaque failure, hiding the status that would have explained it.
function mockRoute(method: EndpointMethod["method"]) {
  return createRouteHandler<{ projectId: string }>(async (req, params) => {
    const publicId = params["projectId"] ?? "";
    const guarded = withErrorHandling(handle);
    const origin = req.headers.get("origin");
    // No Origin means curl, Postman or a server calling. Nothing to negotiate, nothing to look up,
    // and with no id there is no project whose settings could be looked up either.
    if (!origin || !publicId) return guarded(req, publicId, method);

    const config = await projectService.getCorsConfig({ public_id: publicId });
    const res = await guarded(req, publicId, method);
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
export const OPTIONS = createRouteHandler<{ projectId: string }>(async (req, params) => {
  const publicId = params["projectId"] ?? "";
  const origin = req.headers.get("origin");

  if (!publicId) return notFound();

  const response = new NextResponse(null, { status: STATUS_CODE.NO_CONTENT });
  response.headers.set("allow", ALLOWED_METHODS);
  if (!origin) return response;

  const config = await projectService.getCorsConfig({ public_id: publicId });
  if (!config) return notFound();

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
