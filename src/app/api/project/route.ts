import UserService from "@/server/services/user.service";
import projectService from "@/server/services/project.service";
import { GetUserByIdSchema } from "@/models/user.model";
import { CreateProjectSchema } from "@/models/project.model";
import { AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";
import { ProjectInfoSchema } from "@/models/project.model";
import IdConverter from "@/app/libs/helpers/idConverter";

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

    const projectInfoValidation = validateData(
      projects.map((p) => ({
        public_id: IdConverter.encode(p.id),
        name: p.name,
        description: p.description,
        user_id: IdConverter.encode(p.user_id),
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
    const userId = GetUserByIdSchema.parse({ id }).id;
    const body = await req.json();
    const projectRaw = { ...body, user_id: userId };
    const validation = validateData(projectRaw, CreateProjectSchema);
    if (!validation.success) {
      return validation.response;
    }
    const project = validation.data;
    const projectCreated = await projectService.createProject(project);
    const projectInfoValidation = validateData(
      {
        public_id: IdConverter.encode(projectCreated.id),
        name: projectCreated.name,
        description: projectCreated.description,
        user_id: IdConverter.encode(projectCreated.user_id),
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
