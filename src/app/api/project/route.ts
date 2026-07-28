import projectService from "@/server/services/project.service";
import { CreateProjectSchema, ProjectInfoSchema } from "@/models/project.model";
import { ERROR_MESSAGES, LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import ApiResponse from "@/server/core/api_response";
import { createStaticRouteHandler, withUserId } from "@/server/core/route_helpers";

export const GET = createStaticRouteHandler(
  withUserId(async (_req, _params, ctx) => {
    const projects = await projectService.getAllProjectsByUserId({ user_public_id: ctx.userId });
    if (projects.length === 0) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }

    const projectInfoValidation = validateData(
      projects.map((p) => ({
        public_id: p.public_id,
        name: p.name,
        description: p.description,
        user_id: ctx.userId,
      })),
      [ProjectInfoSchema]
    );
    if (!projectInfoValidation.success) return projectInfoValidation.response;
    return ApiResponse.success({ data: projectInfoValidation.data });
  })
);

export const POST = createStaticRouteHandler(
  withUserId(async (req, _params, ctx) => {
    const canCreate = await projectService.canCreateProject(ctx.userId);
    if (!canCreate) {
      return ApiResponse.error({
        message: LIMIT_MESSAGES.PROJECT_LIMIT_REACHED,
        statusCode: STATUS_CODE.FORBIDDEN,
      });
    }

    const body = await req.json();
    const validation = validateData(
      { ...body, user_public_id: ctx.userId },
      CreateProjectSchema
    );
    if (!validation.success) return validation.response;

    const projectCreated = await projectService.createProject(validation.data);
    const projectInfoValidation = validateData(
      {
        public_id: projectCreated.public_id,
        name: projectCreated.name,
        description: projectCreated.description,
        user_id: ctx.userId,
      },
      ProjectInfoSchema
    );
    if (!projectInfoValidation.success) return projectInfoValidation.response;
    return ApiResponse.success({ data: projectInfoValidation.data });
  })
);

export const DELETE = createStaticRouteHandler(
  withUserId(async (_req, _params, ctx) => {
    const deleted = await projectService.deleteAllProjectsByUserId({ user_public_id: ctx.userId });
    if (deleted.count === 0) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    }
    return ApiResponse.success();
  })
);
