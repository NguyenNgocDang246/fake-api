import { after, NextRequest, NextResponse } from "next/server";
import ApiResponse from "@/server/core/api_response";
import EndpointService from "@/server/services/endpoint/endpoint.service";
import EndpointVariantService from "@/server/services/endpoint/endpoint_variant.service";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import {
  EndpointMethod,
  EndpointResponseSchema,
  getEndpointByPathSchema,
} from "@/models/endpoint.model";
import { validateData } from "@/server/core/validation";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  return NextResponse.json(body, {
    status: validEndpoint.status_code || STATUS_CODE.OK,
  });
}

async function resolveBody(
  endpoint: {
    id: bigint;
    method: string;
    path: string;
    response_body: string;
    ai_enabled: boolean;
    ai_fields: string[];
    ai_prompt: string | null;
  },
  baseBody: unknown
): Promise<unknown> {
  if (!endpoint.ai_enabled || endpoint.ai_fields.length === 0) return baseBody;

  try {
    const variant = await EndpointVariantService.pickVariant(endpoint.id);
    // Parsed before the callback is scheduled, so a corrupt row is not counted as used for a
    // response nobody received.
    const body = variant ? readVariantBody(variant.response_body, endpoint.path) : null;

    after(async () => {
      try {
        if (variant && body !== null) await EndpointVariantService.markVariantUsed(variant.id);
        await EndpointVariantService.refillIfNeeded(endpoint);
      } catch (error) {
        console.error("[ai] post-response variant work failed", {
          endpoint_id: String(endpoint.id),
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    });

    return body === null ? baseBody : body.value;
  } catch (error) {
    console.error("[ai] falling back to base body", { path: endpoint.path, error });
    return baseBody;
  }
}

// Wrapped in an object so a variant that legitimately parses to `null` stays distinguishable
function readVariantBody(responseBody: string, path: string): { value: unknown } | null {
  try {
    return { value: JSON.parse(responseBody) };
  } catch (error) {
    console.error("[ai] stored variant is not valid JSON, serving the base body", {
      path,
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function GET(req: NextRequest) {
  return await handle(req, "GET");
}

export async function POST(req: NextRequest) {
  return await handle(req, "POST");
}

export async function PUT(req: NextRequest) {
  return await handle(req, "PUT");
}

export async function PATCH(req: NextRequest) {
  return await handle(req, "PATCH");
}

export async function DELETE(req: NextRequest) {
  return await handle(req, "DELETE");
}
