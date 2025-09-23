import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { GetUserByIdSchema } from "@/models/user.model";
import { AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import { GetProjectByIdSchema } from "@/models/project.model";
import IdConverter from "@/app/libs/helpers/idConverter";
import checkProjectPermission from "@/app/api/project/helpers/checkProjectPermission";
import { GetEndpointGroupByIdSchema } from "@/models/endpoint_group.model";
import { EndpointInfoSchema, CreateEndpointSchema } from "@/models/endpoint.model";
import EndpointService from "@/server/services/endpoint.service";
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ projectId: string; endpointGroupId: string }> }
) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ id }).id;

    const params = await props.params;
    const projectIdRaw = params.projectId;

    const projectIdValidation = validateData(
      { id: IdConverter.decode(projectIdRaw) },
      GetProjectByIdSchema
    );
    if (!projectIdValidation.success) {
      return projectIdValidation.response;
    }
    const projectId = projectIdValidation.data.id;

    const hasPermission = await checkProjectPermission({ projectId, userId });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const endpointGroupIdRaw = params.endpointGroupId;
    const endpointGroupIdValidation = validateData(
      { id: IdConverter.decode(endpointGroupIdRaw) },
      GetEndpointGroupByIdSchema
    );
    if (!endpointGroupIdValidation.success) {
      return endpointGroupIdValidation.response;
    }
    const endpointGroupId = endpointGroupIdValidation.data.id;

    const endpoints = await EndpointService.getAllEndpoints({ id: endpointGroupId });
    if (endpoints.length === 0) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }

    const endpointInfoValidation = validateData(
      endpoints.map((e) => ({
        public_id: IdConverter.encode(e.id),
        path: e.path,
        method: e.method,
        status_code: e.status_code,
        response_body: e.response_body,
        delay_ms: e.delay_ms,
        endpoint_groups_id: IdConverter.encode(e.endpoint_groups_id),
      })),
      [EndpointInfoSchema]
    );
    if (!endpointInfoValidation.success) {
      return endpointInfoValidation.response;
    }
    return ApiResponse.success({ data: endpointInfoValidation.data });
  } catch (error) {
    if (error instanceof AppError) {
      return ApiResponse.error({
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return ApiResponse.error();
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ projectId: string; endpointGroupId: string }> }
) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ id }).id;

    const params = await props.params;
    const projectIdRaw = params.projectId;

    const projectIdValidation = validateData(
      { id: IdConverter.decode(projectIdRaw) },
      GetProjectByIdSchema
    );
    if (!projectIdValidation.success) {
      return projectIdValidation.response;
    }
    const projectId = projectIdValidation.data.id;

    const hasPermission = await checkProjectPermission({ projectId, userId });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const endpointGroupIdRaw = params.endpointGroupId;
    const endpointGroupIdValidation = validateData(
      { id: IdConverter.decode(endpointGroupIdRaw) },
      GetEndpointGroupByIdSchema
    );
    if (!endpointGroupIdValidation.success) {
      return endpointGroupIdValidation.response;
    }
    const endpointGroupId = endpointGroupIdValidation.data.id;

    const body = await req.json();
    const endpointValidation = validateData(
      { ...body, endpoint_groups_id: endpointGroupId },
      CreateEndpointSchema
    );
    if (!endpointValidation.success) {
      return endpointValidation.response;
    }
    const endpoint = endpointValidation.data;
    const endpointCreate = await EndpointService.createEndpoint(endpoint);
    const endpointInfoValidation = validateData(
      {
        public_id: IdConverter.encode(endpointCreate.id),
        path: endpointCreate.path,
        method: endpointCreate.method,
        status_code: endpointCreate.status_code,
        response_body: endpointCreate.response_body,
        delay_ms: endpointCreate.delay_ms,
        endpoint_groups_id: IdConverter.encode(endpointCreate.endpoint_groups_id),
      },
      EndpointInfoSchema
    );
    if (!endpointInfoValidation.success) {
      return endpointInfoValidation.response;
    }
    return ApiResponse.success({
      data: endpointInfoValidation.data,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return ApiResponse.error({
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return ApiResponse.error();
  }
}
