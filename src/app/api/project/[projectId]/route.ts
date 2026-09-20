import ApiResponse from "@/server/core/api_response";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { validateData } from "@/server/core/validation";
import projectService from "@/server/services/project.service";
import {
  ProjectInfoSchema,
  UpdateProjectByIdSchema,
  toProjectInfoInput,
} from "@/models/project.model";
import {
  createRouteHandler,
  missingOrForbidden,
  withProjectId,
  withUserId,
} from "@/server/core/route_helpers";

type ProjectRouteParams = { projectId: string };

export const GET = createRouteHandler<ProjectRouteParams>(
  withUserId(
    withProjectId(async (_req, _params, ctx) => {
      // Read through the owner, so a row that comes back is this user's. Only an empty answer
      // pays for the query that says whether it was somebody else's or nobody's.
      const project = await projectService.getOwnedProjectById({
        public_id: ctx.projectId,
        owner: { user_public_id: ctx.userId },
      });
      if (project === null) {
        return missingOrForbidden(
          await projectService.projectExists({ public_id: ctx.projectId })
        );
      }

      const projectInfoValidation = validateData(
        toProjectInfoInput(project, ctx.userId),
        ProjectInfoSchema
      );
      if (!projectInfoValidation.success) return projectInfoValidation.response;
      return ApiResponse.success({ data: projectInfoValidation.data });
    })
  )
);

export const PUT = createRouteHandler<ProjectRouteParams>(
  withUserId(
    withProjectId(async (req, _params, ctx) => {
      const project = await projectService.getProjectById({ public_id: ctx.projectId });
      if (project === null) {
        return ApiResponse.error({
          message: ERROR_MESSAGES.NO_CONTENT,
          statusCode: STATUS_CODE.NO_CONTENT,
        });
      }
      const hasPermission = await projectService.checkPermission({
        userProps: { public_id: ctx.userId },
        projectProps: { public_id: ctx.projectId },
      });
      if (!hasPermission) {
        return ApiResponse.error({
          message: ERROR_MESSAGES.FORBIDDEN,
          statusCode: STATUS_CODE.FORBIDDEN,
        });
      }

      const body = await req.json();
      const updateProjectValidation = validateData(
        { ...body, public_id: ctx.projectId },
        UpdateProjectByIdSchema
      );
      if (!updateProjectValidation.success) return updateProjectValidation.response;

      const projectUpdated = await projectService.updateProjectById(updateProjectValidation.data);
      const projectInfoValidation = validateData(
        toProjectInfoInput(projectUpdated, ctx.userId),
        ProjectInfoSchema
      );
      if (!projectInfoValidation.success) return projectInfoValidation.response;
      return ApiResponse.success({ data: projectInfoValidation.data });
    })
  )
);

export const DELETE = createRouteHandler<ProjectRouteParams>(
  withUserId(
    withProjectId(async (_req, _params, ctx) => {
      const project = await projectService.getProjectById({ public_id: ctx.projectId });
      if (project === null) {
        return ApiResponse.error({
          message: ERROR_MESSAGES.NO_CONTENT,
          statusCode: STATUS_CODE.NO_CONTENT,
        });
      }
      const hasPermission = await projectService.checkPermission({
        userProps: { public_id: ctx.userId },
        projectProps: { public_id: ctx.projectId },
      });
      if (!hasPermission) {
        return ApiResponse.error({
          message: ERROR_MESSAGES.FORBIDDEN,
          statusCode: STATUS_CODE.FORBIDDEN,
        });
      }

      await projectService.deleteProjectById({ public_id: ctx.projectId });
      return ApiResponse.success();
    })
  )
);
