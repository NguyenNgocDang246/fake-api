import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { GetUserByIdSchema } from "@/models/user.model";
import { AppError } from "@/server/core/errors";
import {
  ERROR_MESSAGES,
  STATUS_CODE,
  ENDPOINT_MESSAGES,
  LIMIT_MESSAGES,
} from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import { GetProjectByIdSchema } from "@/models/project.model";
import { GetEndpointGroupByIdSchema } from "@/models/endpoint_group.model";
import { EndpointInfoSchema, CreateEndpointSchema } from "@/models/endpoint.model";
import EndpointService from "@/server/services/endpoint.service";
import endpointGroupService from "@/server/services/endpoint_group.service";
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ projectId: string; endpointGroupId: string }> }
) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ public_id: id }).public_id;

    const params = await props.params;
    const projectIdRaw = params.projectId;

    const projectIdValidation = validateData(
      { public_id: projectIdRaw },
      GetProjectByIdSchema
    );
    if (!projectIdValidation.success) {
      return projectIdValidation.response;
    }
    const projectId = projectIdValidation.data.public_id;

    const endpointGroupIdRaw = params.endpointGroupId;
    const endpointGroupIdValidation = validateData(
      { public_id: endpointGroupIdRaw },
      GetEndpointGroupByIdSchema
    );
    if (!endpointGroupIdValidation.success) {
      return endpointGroupIdValidation.response;
    }
    const endpointGroupId = endpointGroupIdValidation.data.public_id;

    const hasPermission = await endpointGroupService.checkPermission({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
      endpointGroupProps: { public_id: endpointGroupId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const endpoints = await EndpointService.getAllEndpoints({ public_id: endpointGroupId });
    if (endpoints.length === 0) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }

    const endpointInfoValidation = validateData(
      endpoints.map((e) => ({
        public_id: e.public_id,
        path: e.path,
        method: e.method,
        status_code: e.status_code,
        response_body: e.response_body,
        delay_ms: e.delay_ms,
        endpoint_groups_id: endpointGroupId,
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
    const userId = GetUserByIdSchema.parse({ public_id: id }).public_id;

    const params = await props.params;
    const projectIdRaw = params.projectId;

    const projectIdValidation = validateData(
      { public_id: projectIdRaw },
      GetProjectByIdSchema
    );
    if (!projectIdValidation.success) {
      return projectIdValidation.response;
    }
    const projectId = projectIdValidation.data.public_id;

    const endpointGroupIdRaw = params.endpointGroupId;
    const endpointGroupIdValidation = validateData(
      { public_id: endpointGroupIdRaw },
      GetEndpointGroupByIdSchema
    );
    if (!endpointGroupIdValidation.success) {
      return endpointGroupIdValidation.response;
    }
    const endpointGroupId = endpointGroupIdValidation.data.public_id;

    const hasPermission = await endpointGroupService.checkPermission({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
      endpointGroupProps: { public_id: endpointGroupId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const canCreate = await EndpointService.canCreateEndpoint({
      user_public_id: userId,
      endpoint_groups_public_id: endpointGroupId,
    });
    if (!canCreate) {
      return ApiResponse.error({
        message: LIMIT_MESSAGES.ENDPOINT_LIMIT_REACHED,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const body = await req.json();
    const endpointValidation = validateData(
      { ...body, endpoint_groups_public_id: endpointGroupId },
      CreateEndpointSchema
    );
    if (!endpointValidation.success) {
      return endpointValidation.response;
    }
    const endpoint = endpointValidation.data;
    const endpointExists = await EndpointService.getEndpointByPath({
      project_public_id: projectId,
      path: endpoint.path,
      method: endpoint.method,
    });
    if (endpointExists) {
      return ApiResponse.error({
        message: ENDPOINT_MESSAGES.ENDPOINT_DUPLICATED,
        statusCode: STATUS_CODE.CONFLICT,
      });
    }
    const endpointCreate = await EndpointService.createEndpoint(endpoint);
    const endpointInfoValidation = validateData(
      {
        public_id: endpointCreate.public_id,
        path: endpointCreate.path,
        method: endpointCreate.method,
        status_code: endpointCreate.status_code,
        response_body: endpointCreate.response_body,
        delay_ms: endpointCreate.delay_ms,
        endpoint_groups_id: endpointGroupId,
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

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ projectId: string; endpointGroupId: string }> }
) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ public_id: id }).public_id;

    const params = await props.params;
    const projectIdRaw = params.projectId;

    const projectIdValidation = validateData(
      { public_id: projectIdRaw },
      GetProjectByIdSchema
    );
    if (!projectIdValidation.success) {
      return projectIdValidation.response;
    }
    const projectId = projectIdValidation.data.public_id;

    const endpointGroupIdRaw = params.endpointGroupId;
    const endpointGroupIdValidation = validateData(
      { public_id: endpointGroupIdRaw },
      GetEndpointGroupByIdSchema
    );
    if (!endpointGroupIdValidation.success) {
      return endpointGroupIdValidation.response;
    }
    const endpointGroupId = endpointGroupIdValidation.data.public_id;

    const hasPermission = await endpointGroupService.checkPermission({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
      endpointGroupProps: { public_id: endpointGroupId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const result = await EndpointService.deleteAllEndpoints({
      endpoint_groups_public_id: endpointGroupId,
    });
    if (result.count === 0) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    return ApiResponse.success();
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
