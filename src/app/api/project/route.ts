import ProjectService from "@/services/project.service";
import { CreateProjectSchema } from "@/models/project.model";
import { ErrorValidation } from "@/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/core/constants";
import ApiResponse from "@/core/api_response";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const projects = await ProjectService.getAllProjects();
    if (projects.length === 0)
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    return ApiResponse.success({ data: projects });
  } catch (error) {
    console.log(error);
    return ApiResponse.error();
  }
}

export async function POST(req: NextRequest) {
  try {
    const project = await req.json();
    const result = CreateProjectSchema.safeParse(project);
    if (!result.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(result.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const createdProject = await ProjectService.createProject(result.data);
    return ApiResponse.success({
      data: createdProject,
      statusCode: STATUS_CODE.CREATED,
    });
  } catch (error) {
    console.log(error);
    return ApiResponse.error();
  }
}
