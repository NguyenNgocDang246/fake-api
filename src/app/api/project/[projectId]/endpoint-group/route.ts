import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import EndpointGroupService from "@/server/services/endpoint_group.service";
import { AppError } from "@/server/core/errors";
import { validateData } from "@/server/core/validation";
import { GetUserByIdSchema } from "@/models/user.model";
import { GetProjectByIdSchema } from "@/models/project.model";
import { CreateEndpointGroupSchema } from "@/models/endpoint_group.model";
import { STATUS_CODE, ERROR_MESSAGES } from "@/server/core/constants";
import checkProjectPermission from "@/app/api/project/helpers/checkProjectPermission";

export async function GET(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ id }).id;

    const params = await props.params;
    const projectIdRaw = params.projectId;
    const validation = validateData({ id: projectIdRaw }, GetProjectByIdSchema);
    if (!validation.success) {
      return validation.response;
    }
    const projectId = validation.data.id;

    const hasPermission = await checkProjectPermission({ projectId, userId });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.UNAUTHORIZED,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }
    const endpointGroups = await EndpointGroupService.getAllEndpointGroups({ id: projectId });
    if (endpointGroups.length === 0) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    return ApiResponse.success({ data: endpointGroups });
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
    const userId = GetUserByIdSchema.parse({ id }).id;

    const params = await props.params;
    const projectIdRaw = params.projectId;
    const projectIdValidation = validateData({ id: projectIdRaw }, GetProjectByIdSchema);
    if (!projectIdValidation.success) {
      return projectIdValidation.response;
    }
    const projectId = projectIdValidation.data.id;

    const hasPermission = await checkProjectPermission({ projectId, userId });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.UNAUTHORIZED,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }

    const body = await req.json();
    const endpointGroupValidation = validateData(
      { ...body, project_id: projectId },
      CreateEndpointGroupSchema
    );
    if (!endpointGroupValidation.success) {
      return endpointGroupValidation.response;
    }
    const endpointGroup = endpointGroupValidation.data;
    const endpointGroupCreated = await EndpointGroupService.createEndpointGroup(endpointGroup);
    return ApiResponse.success({ data: endpointGroupCreated });
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
