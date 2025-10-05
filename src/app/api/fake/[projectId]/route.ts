import { NextRequest, NextResponse } from "next/server";
import ApiResponse from "@/server/core/api_response";
import IdConverter from "@/app/libs/helpers/idConverter";
import EndpointService from "@/server/services/endpoint.service";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { EndpointMethod } from "@/models/endpoint.model";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handle(req: NextRequest, method: EndpointMethod["method"]) {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const publicId = segments[0];
  const projectId = IdConverter.decode(publicId);
  const pathname = "/" + segments.slice(1).join("/");

  const endpoint = await EndpointService.getEndpointByPath({
    project_id: projectId,
    path: pathname,
    method,
  });
  if (!endpoint)
    return ApiResponse.error({
      message: ERROR_MESSAGES.NOT_FOUND,
      statusCode: STATUS_CODE.NOT_FOUND,
    });
  await sleep(endpoint.delay_ms || 0);

  if (endpoint.method !== method)
    return ApiResponse.error({
      message: ERROR_MESSAGES.METHOD_NOT_ALLOWED,
      statusCode: STATUS_CODE.METHOD_NOT_ALLOWED,
    });

  if (endpoint.status_code == STATUS_CODE.NO_CONTENT)
    return new NextResponse(null, { status: STATUS_CODE.NO_CONTENT });

  return NextResponse.json(endpoint.response_body, {
    status: endpoint.status_code || STATUS_CODE.OK,
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
