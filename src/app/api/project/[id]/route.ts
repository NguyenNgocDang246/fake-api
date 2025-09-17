import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { GetProjectByIdSchema } from "@/models/project.model";
import { GetUserByIdSchema } from "@/models/user.model";
import { ErrorValidation, AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import projectService from "@/server/services/project.service";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const userIdRaw = req.headers.get("x-userId");
    const userIdResult = GetUserByIdSchema.safeParse({ id: userIdRaw });
    if (!userIdResult.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(userIdResult.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }

    const params = await props.params;
    const projectIdRaw = params.id;
    const projectIdResult = GetProjectByIdSchema.safeParse({ id: projectIdRaw });
    if (!projectIdResult.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(projectIdResult.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }

    const userId = userIdResult.data.id;
    const projectId = projectIdResult.data.id;

    const project = await projectService.getProjectById({ id: projectId });
    if (project === null) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    if (userId !== project.user_id) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.UNAUTHORIZED,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }

    return ApiResponse.success({ data: project });
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
