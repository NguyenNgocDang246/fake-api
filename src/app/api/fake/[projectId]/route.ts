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
  if (!endpoint)
    return ApiResponse.error({
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: STATUS_CODE.NOT_FOUND,
    });

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

  if (validEndpoint.method !== method)
    return ApiResponse.error({
      message: ERROR_MESSAGES.METHOD_NOT_ALLOWED,
      statusCode: STATUS_CODE.METHOD_NOT_ALLOWED,
    });

  if (validEndpoint.status_code == STATUS_CODE.NO_CONTENT)
    return new NextResponse(null, { status: STATUS_CODE.NO_CONTENT });

  const body = await resolveBody(endpoint, validEndpoint.response_body);

  return NextResponse.json(body, {
    status: validEndpoint.status_code || STATUS_CODE.OK,
  });
}

/**
 * Decide which body to return. An AI-enabled endpoint takes the next variant from its pool,
 * while bumping the use counter and refilling move to `after()` so the request is no slower.
 *
 * Every failure path falls back to the base body: an empty pool, a corrupt variant, or a
 * dead provider must never make the fake API return an error.
 */
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

    after(async () => {
      if (variant) await EndpointVariantService.markVariantUsed(variant.id);
      await EndpointVariantService.refillIfNeeded(endpoint);
    });

    return variant ? JSON.parse(variant.response_body) : baseBody;
  } catch (error) {
    console.error("[ai] falling back to base body", { path: endpoint.path, error });
    return baseBody;
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
