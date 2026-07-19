import { NextRequest } from "next/server";
import tokenService from "@/server/services/auth/token.service";
import userService from "@/server/services/user.service";
import ApiResponse from "@/server/core/api_response";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/server/core/constants";
import { AppError } from "@/server/core/errors";
import { MiddlewareContext } from "@/middleware";

const authMiddleware = async ({
  req,
  ctx,
  isApiRoute,
}: {
  req: NextRequest;
  ctx: MiddlewareContext;
  isApiRoute: boolean;
}) => {
  const accessToken = req.cookies.get("access_token")?.value;
  if (accessToken) {
    try {
      const payload = await tokenService.verifyAccessToken(accessToken);
      ctx.userId = String(payload.id);
      return null;
    } catch {
      // fall through to refresh
    }
  }

  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    try {
      const payload = await tokenService.verifyRefreshToken(refreshToken);
      const user = await userService.getUserById({ id: payload.id });
      if (!user || user.token_version !== payload.token_version) {
        throw new AppError({
          message: TOKEN_MESSAGE.INVALID_EXPIRED_REFRESH_TOKEN,
          statusCode: STATUS_CODE.UNAUTHORIZED,
        });
      }
      const newAccessToken = await tokenService.createAccessToken({ id: payload.id });
      req.cookies.set("access_token", newAccessToken);
      ctx.userId = String(payload.id);
      ctx.refreshedAccessToken = newAccessToken;
      return null;
    } catch {
      // refresh failed, fall through
    }
  }

  if (!isApiRoute) return null;

  return ApiResponse.error({
    message: TOKEN_MESSAGE.INVALID_TOKEN,
    statusCode: STATUS_CODE.UNAUTHORIZED,
  });
};

export default authMiddleware;
