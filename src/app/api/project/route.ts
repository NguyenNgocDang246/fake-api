import UserService from "@/server/services/user.service";
import projectService from "@/server/services/project.service";
import { GetUserByIdSchema } from "@/models/user.model";
import { CreateProjectSchema } from "@/models/project.model";
import { ErrorValidation, AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
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
    const projects = await UserService.getUserProjects(userIdResult.data);
    if (projects.length === 0)
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    return ApiResponse.success({ data: projects });
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

export async function POST(req: NextRequest) {
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
    const data = await req.json();
    const projectRaw = { ...data, user_id: userIdResult.data.id };
    const projectResult = CreateProjectSchema.safeParse(projectRaw);
    if (!projectResult.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(projectResult.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const project = await projectService.createProject(projectResult.data);
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
