import { after, NextRequest, NextResponse } from "next/server";
import ApiResponse from "@/server/core/api_response";
import EndpointService from "@/server/services/endpoint/endpoint.service";
import endpointVariantPlanService, {
  PlanEndpoint,
} from "@/server/services/endpoint/variant/plan.service";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import {
  EndpointMethod,
  EndpointResponseSchema,
  getEndpointByPathSchema,
} from "@/models/endpoint/endpoint.model";
import { validateData } from "@/server/core/validation";
import { createStaticRouteHandler } from "@/server/core/route_helpers";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Either a whole string literal, which is kept as it is, or a run of whitespace outside one.
const JSON_TOKEN = /("(?:\\.|[^"\\])*")|[ \t\n\r]+/g;

// The whitespace the editor wrote is dropped without a parse, so key order and number literals
// reach the client exactly as the author stored them.
function compactJson(text: string): string {
  return text.replace(JSON_TOKEN, (_match, stringLiteral) => stringLiteral ?? "");
}

async function handle(req: NextRequest, method: EndpointMethod["method"]) {
  const rawPathname = req.nextUrl.pathname.split(/[?#]/)[0] ?? "";
  const segments = rawPathname.split("/").filter(Boolean);
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
      return ApiResponse.error({
        message: ERROR_MESSAGES.METHOD_NOT_ALLOWED,
        statusCode: STATUS_CODE.METHOD_NOT_ALLOWED,
        errors: { allow },
      });
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
      delay_ms: endpoint.delay_ms,
    },
    EndpointResponseSchema
  );
  if (!endpointValidation.success) return endpointValidation.response;
  const validEndpoint = endpointValidation.data;
  await sleep(validEndpoint.delay_ms || 0);

  if (validEndpoint.status_code == STATUS_CODE.NO_CONTENT)
    return new NextResponse(null, { status: STATUS_CODE.NO_CONTENT });

  const body = await resolveBody(endpoint, validEndpoint.response_body);

  // Only whitespace is stripped, never handed to `NextResponse.json`, so the bytes the author
  // typed are the bytes the client reads. Rebuilding them through a parse is what loses a large
  // integer's precision and reorders integer-like keys.
  return new NextResponse(compactJson(body), {
    status: validEndpoint.status_code || STATUS_CODE.OK,
    headers: { "content-type": "application/json" },
  });
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

export const GET = createStaticRouteHandler((req) => handle(req, "GET"));
export const POST = createStaticRouteHandler((req) => handle(req, "POST"));
export const PUT = createStaticRouteHandler((req) => handle(req, "PUT"));
export const PATCH = createStaticRouteHandler((req) => handle(req, "PATCH"));
export const DELETE = createStaticRouteHandler((req) => handle(req, "DELETE"));
