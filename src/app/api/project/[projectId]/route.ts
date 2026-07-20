import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { GetProjectByIdSchema } from "@/models/project.model";
import { GetUserByIdSchema } from "@/models/user.model";
import { AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import projectService from "@/server/services/project.service";
import { ProjectInfoSchema, UpdateProjectByIdSchema } from "@/models/project.model";

export async function GET(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ public_id: id }).public_id;
    const params = await props.params;
    const validation = validateData({ public_id: params.projectId }, GetProjectByIdSchema);
    if (!validation.success) {
      return validation.response;
    }
    const projectId = validation.data.public_id;

    const project = await projectService.getProjectById({ public_id: projectId });
    if (project === null) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NOT_FOUND,
        statusCode: STATUS_CODE.NOT_FOUND,
      });
    }
    const hasPermission = await projectService.checkPermission({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const projectInfoValidation = validateData(
      {
        public_id: project.public_id,
        name: project.name,
        description: project.description,
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
export async function PUT(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ public_id: id }).public_id;
    const params = await props.params;
    const validation = validateData({ public_id: params.projectId }, GetProjectByIdSchema);
    if (!validation.success) {
      return validation.response;
    }
    const projectId = validation.data.public_id;

    const project = await projectService.getProjectById({ public_id: projectId });
    if (project === null) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    const hasPermission = await projectService.checkPermission({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const body = await req.json();
    const projectRaw = { ...body, public_id: projectId };
    const updateProjectValidation = validateData(projectRaw, UpdateProjectByIdSchema);
    if (!updateProjectValidation.success) {
      return updateProjectValidation.response;
    }
    const updateProject = updateProjectValidation.data;
    const projectUpdated = await projectService.updateProjectById(updateProject);
    const projectInfoValidation = validateData(
      {
        public_id: projectUpdated.public_id,
        name: projectUpdated.name,
        description: projectUpdated.description,
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

export async function DELETE(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ public_id: id }).public_id;
    const params = await props.params;
    const validation = validateData({ public_id: params.projectId }, GetProjectByIdSchema);
    if (!validation.success) {
      return validation.response;
    }
    const projectId = validation.data.public_id;

    const project = await projectService.getProjectById({ public_id: projectId });
    if (project === null) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    const hasPermission = await projectService.checkPermission({
      userProps: { public_id: userId },
      projectProps: { public_id: projectId },
    });
    if (!hasPermission) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.FORBIDDEN,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    await projectService.deleteProjectById({ public_id: projectId });
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
