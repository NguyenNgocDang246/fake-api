import userService from "@/server/services/user.service";
import { UserInfoSchema } from "@/models/user.model";
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
    const validation = validateData(
      {
        public_id: user.public_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      UserInfoSchema
    );
    if (!validation.success) return validation.response;
    return ApiResponse.success({ data: validation.data });
  })
);
