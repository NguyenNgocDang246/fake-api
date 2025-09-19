import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import EndpointGroupService from "@/server/services/endpoint_group.service";
import { ErrorValidation, AppError } from "@/server/core/errors";
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
    const projectIdResult = GetProjectByIdSchema.safeParse({ id: projectIdRaw });
    if (!projectIdResult.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(projectIdResult.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const projectId = projectIdResult.data.id;

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
    const projectIdResult = GetProjectByIdSchema.safeParse({ id: projectIdRaw });
    if (!projectIdResult.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(projectIdResult.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const projectId = projectIdResult.data.id;

    const hasPermission = await checkProjectPermission({ projectId, userId });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.UNAUTHORIZED,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }

    const data = await req.json();
    const parsed = CreateEndpointGroupSchema.safeParse({ ...data, project_id: projectId });
    if (!parsed.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(parsed.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const endpointGroup = await EndpointGroupService.createEndpointGroup({
      ...parsed.data,
    });
    return ApiResponse.success({ data: endpointGroup });
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
