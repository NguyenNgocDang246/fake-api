import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { serialize } from "cookie";
import ApiResponse from "@/server/core/api_response";
import { AppError } from "@/server/core/errors";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/server/core/constants";
import { ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS } from "@/server/core/constants";
import tokenService from "@/server/services/auth/token.service";

export async function POST(req: NextRequest) {
  void req;
  // const body = await req.json();
  // const CSRFToken = body.csrfToken;
  // TODO: Xử lý CSRF Token
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;
  try {
    if (!refreshToken) {
      return ApiResponse.error({
        message: TOKEN_MESSAGE.INVALID_REFRESH_TOKEN,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const payload = await tokenService.verifyRefreshToken(refreshToken);
    const accessToken = await tokenService.createAccessToken({ id: payload.id });
    const res = ApiResponse.success();
    const cookie = serialize("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS,
      path: "/",
    });
    res.headers.set("Set-Cookie", cookie);
    return res;
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
