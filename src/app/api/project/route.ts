import projectService from "@/server/services/project.service";
import { GetUserByIdSchema } from "@/models/user.model";
import { CreateProjectSchema } from "@/models/project.model";
import { AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";
import { ProjectInfoSchema } from "@/models/project.model";

export async function GET(req: NextRequest) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ public_id: id }).public_id;
    const projects = await projectService.getAllProjectsByUserId({ user_public_id: userId });
    if (projects.length === 0)
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });

    const projectInfoValidation = validateData(
      projects.map((p) => ({
        public_id: p.public_id,
        name: p.name,
        description: p.description,
        user_id: userId,
      })),
      [ProjectInfoSchema]
    );
    if (!projectInfoValidation.success) {
      return projectInfoValidation.response;
    }
    const projectInfo = projectInfoValidation.data;
    return ApiResponse.success({ data: projectInfo });
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
    const userId = GetUserByIdSchema.parse({ public_id: id }).public_id;
    const body = await req.json();
    const projectRaw = { ...body, user_public_id: userId };
    const validation = validateData(projectRaw, CreateProjectSchema);
    if (!validation.success) {
      return validation.response;
    }
    const project = validation.data;
    const projectCreated = await projectService.createProject(project);
    const projectInfoValidation = validateData(
      {
        public_id: projectCreated.public_id,
        name: projectCreated.name,
        description: projectCreated.description,
        user_id: userId,
      },
      ProjectInfoSchema
    );
    if (!projectInfoValidation.success) {
      return projectInfoValidation.response;
    }
    const projectInfo = projectInfoValidation.data;
    return ApiResponse.success({ data: projectInfo });
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

export async function DELETE(req: NextRequest) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ public_id: id }).public_id;
    const deleted = await projectService.deleteAllProjectsByUserId({ user_public_id: userId });
    if (deleted.count === 0) {
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
