import { cookies } from "next/headers";
import TokenService from "@/server/services/auth/token.service";
import ApiResponse from "@/server/core/api_response";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/server/core/constants";
import { AppError } from "@/server/core/errors";
import { MiddlewareContext } from "@/middleware";

const authMiddleware = async ({ ctx }: { ctx: MiddlewareContext }) => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) {
    return ApiResponse.error({
      message: TOKEN_MESSAGE.INVALID_TOKEN,
      statusCode: STATUS_CODE.UNAUTHORIZED,
    });
  }

  try {
    const payload = await TokenService.verifyAccessToken(accessToken);
    // console.log(payload);
    ctx.userId = String(payload.id);
    return null;
  } catch (error) {
    if (error instanceof AppError) {
      return ApiResponse.error({
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return ApiResponse.error();
  }
};

export default authMiddleware;
