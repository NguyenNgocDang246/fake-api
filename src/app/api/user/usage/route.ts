import userService from "@/server/services/user.service";
import projectService from "@/server/services/project.service";
import aiUsageService from "@/server/services/ai_usage.service";
import { UserSchema, UserUsageSchema } from "@/models/user.model";
import { ROLE_LIMITS } from "@/server/core/role_limits";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import ApiResponse from "@/server/core/api_response";
import { validateData } from "@/server/core/validation";
import { createStaticRouteHandler, withUserId } from "@/server/core/route_helpers";

export const GET = createStaticRouteHandler(
  withUserId(async (_req, _params, ctx) => {
    const user = await userService.getUserById({ public_id: ctx.userId });
    if (user === null) {
      return ApiResponse.error({
        message: ERROR_MESSAGES.UNAUTHORIZED,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }

    const role = UserSchema.shape.role.parse(user.role);
    const limits = ROLE_LIMITS[role];
    const [projects, aiQuota] = await Promise.all([
      projectService.countForUser(ctx.userId),
      aiUsageService.quotaFor({ public_id: ctx.userId }),
    ]);

    const validation = validateData(
      {
        role,
        limits: {
          max_projects: limits.maxProjects,
          max_groups_per_project: limits.maxGroupsPerProject,
          max_endpoints_per_group: limits.maxEndpointsPerGroup,
          max_ai_plans_per_day: limits.maxAiPlansPerDay,
        },
        used: { projects, ai_plans_today: aiQuota.spent },
      },
      UserUsageSchema
    );
    if (!validation.success) return validation.response;
    return ApiResponse.success({ data: validation.data });
  })
);
