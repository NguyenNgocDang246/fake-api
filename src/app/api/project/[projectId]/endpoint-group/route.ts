import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import EndpointGroupService from "@/server/services/endpoint_group.service";
import ProjectService from "@/server/services/project.service";
import { AppError } from "@/server/core/errors";
import { validateData } from "@/server/core/validation";
import { GetUserByIdSchema } from "@/models/user.model";
import { GetProjectByIdSchema } from "@/models/project.model";
import {
  CreateEndpointGroupSchema,
  EndpointGroupInfoSchema,
} from "@/models/endpoint_group.model";
import { STATUS_CODE, ERROR_MESSAGES, LIMIT_MESSAGES } from "@/server/core/constants";

export async function GET(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ public_id: id }).public_id;

    const params = await props.params;
    const projectIdRaw = params.projectId;

    const validation = validateData({ public_id: projectIdRaw }, GetProjectByIdSchema);
    if (!validation.success) {
      return validation.response;
    }
    const projectId = validation.data.public_id;

    const hasPermission = await ProjectService.checkPermission({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }
    const endpointGroups = await EndpointGroupService.getAllEndpointGroups({
      public_id: projectId,
    });
    if (endpointGroups.length === 0) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    const endpointGroupInfoValidation = validateData(
      endpointGroups.map((e) => ({
        public_id: e.public_id,
        name: e.name,
        project_id: projectId,
        endpoint_count: e._count.endpoints,
      })),
      [EndpointGroupInfoSchema]
    );
    if (!endpointGroupInfoValidation.success) {
      return endpointGroupInfoValidation.response;
    }
    const endpointGroupInfo = endpointGroupInfoValidation.data;
    return ApiResponse.success({ data: endpointGroupInfo });
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

export async function POST(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
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

    const hasPermission = await ProjectService.checkPermission({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const canCreate = await EndpointGroupService.canCreateEndpointGroup({
      user_public_id: userId,
      project_public_id: projectId,
    });
    if (!canCreate) {
      return ApiResponse.error({
        message: LIMIT_MESSAGES.ENDPOINT_GROUP_LIMIT_REACHED,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const body = await req.json();
    const endpointGroupValidation = validateData(
      { ...body, project_public_id: projectId },
      CreateEndpointGroupSchema
    );
    if (!endpointGroupValidation.success) {
      return endpointGroupValidation.response;
    }
    const endpointGroup = endpointGroupValidation.data;
    const endpointGroupCreated = await EndpointGroupService.createEndpointGroup(endpointGroup);
    const endpointGroupInfoValidation = validateData(
      {
        public_id: endpointGroupCreated.public_id,
        name: endpointGroupCreated.name,
        project_id: projectId,
        endpoint_count: 0,
      },
      EndpointGroupInfoSchema
    );
    if (!endpointGroupInfoValidation.success) {
      return endpointGroupInfoValidation.response;
    }
    const endpointGroupInfo = endpointGroupInfoValidation.data;
    return ApiResponse.success({ data: endpointGroupInfo });
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
