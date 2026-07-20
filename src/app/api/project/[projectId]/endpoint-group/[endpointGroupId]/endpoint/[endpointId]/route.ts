import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { GetUserByIdSchema } from "@/models/user.model";
import { AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import { GetProjectByIdSchema } from "@/models/project.model";
import { GetEndpointGroupByIdSchema } from "@/models/endpoint_group.model";
import EndpointService from "@/server/services/endpoint.service";
import {
  EndpointInfoSchema,
  GetEndpointByIdSchema,
  UpdateEndpointByIdSchema,
} from "@/models/endpoint.model";
import endpointService from "@/server/services/endpoint.service";
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ projectId: string; endpointGroupId: string; endpointId: string }> }
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

    const endpointIdRaw = params.endpointId;
    const endpointIdValidation = validateData(
      { public_id: endpointIdRaw },
      GetEndpointByIdSchema
    );
    if (!endpointIdValidation.success) {
      return endpointIdValidation.response;
    }
    const endpointId = endpointIdValidation.data.public_id;

    const hasPermission = await endpointService.checkPermissions({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
      endpointGroupProps: { public_id: endpointGroupId },
      endpointProps: { public_id: endpointId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const endpoint = await EndpointService.getEndpointById({ public_id: endpointId });
    if (!endpoint) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NOT_FOUND,
        statusCode: STATUS_CODE.NOT_FOUND,
      });
    }
    const endpointValidation = validateData(
      {
        public_id: endpoint.public_id,
        path: endpoint.path,
        method: endpoint.method,
        status_code: endpoint.status_code,
        response_body: endpoint.response_body,
        delay_ms: endpoint.delay_ms,
        endpoint_groups_id: endpointGroupId,
      },
      EndpointInfoSchema
    );
    if (!endpointValidation.success) {
      return endpointValidation.response;
    }
    const endpointInfo = endpointValidation.data;
    return ApiResponse.success({ data: endpointInfo });
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

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ projectId: string; endpointGroupId: string; endpointId: string }> }
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

    const endpointIdRaw = params.endpointId;
    const endpointIdValidation = validateData(
      { public_id: endpointIdRaw },
      GetEndpointByIdSchema
    );
    if (!endpointIdValidation.success) {
      return endpointIdValidation.response;
    }
    const endpointId = endpointIdValidation.data.public_id;

    const hasPermission = await endpointService.checkPermissions({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
      endpointGroupProps: { public_id: endpointGroupId },
      endpointProps: { public_id: endpointId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }
    const data = await req.json();

    const updateEndpointInfoValidation = validateData(
      { ...data, public_id: endpointId },
      UpdateEndpointByIdSchema
    );
    if (!updateEndpointInfoValidation.success) {
      return updateEndpointInfoValidation.response;
    }
    const endpointInfo = updateEndpointInfoValidation.data;

    const endpointUpdated = await EndpointService.updateEndpointById(endpointInfo);
    if (!endpointUpdated) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    const endpointInfoValidation = validateData(
      {
        public_id: endpointUpdated.public_id,
        path: endpointUpdated.path,
        method: endpointUpdated.method,
        status_code: endpointUpdated.status_code,
        response_body: endpointUpdated.response_body,
        delay_ms: endpointUpdated.delay_ms,
        endpoint_groups_id: endpointGroupId,
      },
      EndpointInfoSchema
    );
    if (!endpointInfoValidation.success) {
      return endpointInfoValidation.response;
    }
    return ApiResponse.success({ data: endpointInfoValidation.data });
  } catch (error) {
    console.log(error);
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
  props: { params: Promise<{ projectId: string; endpointGroupId: string; endpointId: string }> }
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

    const endpointIdRaw = params.endpointId;
    const endpointIdValidation = validateData(
      { public_id: endpointIdRaw },
      GetEndpointByIdSchema
    );
    if (!endpointIdValidation.success) {
      return endpointIdValidation.response;
    }
    const endpointId = endpointIdValidation.data.public_id;

    const hasPermission = await endpointService.checkPermissions({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
      endpointGroupProps: { public_id: endpointGroupId },
      endpointProps: { public_id: endpointId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const endpointDeleted = await EndpointService.deleteEndpointById({ public_id: endpointId });
    if (!endpointDeleted) {
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
