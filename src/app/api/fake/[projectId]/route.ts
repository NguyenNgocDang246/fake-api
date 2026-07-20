import { NextRequest, NextResponse } from "next/server";
import ApiResponse from "@/server/core/api_response";
import EndpointService from "@/server/services/endpoint.service";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { EndpointMethod, EndpointResponseSchema } from "@/models/endpoint.model";
import { validateData } from "@/server/core/validation";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handle(req: NextRequest, method: EndpointMethod["method"]) {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const publicId = segments[0];
  if (!publicId)
    return ApiResponse.error({
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: STATUS_CODE.NOT_FOUND,
    });
  const pathname = "/" + segments.slice(1).join("/");

  const endpoint = await EndpointService.getEndpointByPath({
    project_public_id: publicId,
    path: pathname,
    method,
  });
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

  return NextResponse.json(validEndpoint.response_body, {
    status: validEndpoint.status_code || STATUS_CODE.OK,
  });
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
