import UserService from "@/server/services/user.service";
import projectService from "@/server/services/project.service";
import { GetUserByIdSchema } from "@/models/user.model";
import { CreateProjectSchema } from "@/models/project.model";
import { AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ id });
    const projects = await UserService.getUserProjects(userId);
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
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ id }).id;
    const body = await req.json();
    const projectRaw = { ...body, user_id: userId };
    const validation = validateData(projectRaw, CreateProjectSchema);
    if (!validation.success) {
      return validation.response;
    }
    const project = validation.data;
    const projectCreated = await projectService.createProject(project);
    return ApiResponse.success({ data: projectCreated });
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
