import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { AppError } from "@/server/core/errors";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/server/core/constants";
import tokenService from "@/server/services/auth/token.service";

export async function POST(req: NextRequest) {
  const { refreshToken } = await req.json();
  try {
    if (!refreshToken) {
      return ApiResponse.error({
        message: TOKEN_MESSAGE.INVALID_REFRESH_TOKEN,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const payload = await tokenService.verifyRefreshToken(refreshToken);
    const accessToken = await tokenService.createAccessToken({ id: payload.id });
    return ApiResponse.success({ data: { accessToken } });
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
