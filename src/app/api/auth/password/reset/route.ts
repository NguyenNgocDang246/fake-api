import { NextRequest } from "next/server";
import { UpdatePasswordSchema } from "@/models/user.model";
import { ResetPasswordTokenPayloadSchema } from "@/models/auth.model";
import { validateData } from "@/server/core/validation";
import ApiResponse from "@/server/core/api_response";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/server/core/constants";
import TokenService from "@/server/services/auth/token.service";
import UserService from "@/server/services/user.service";
import AuthService from "@/server/services/auth/auth.service";
import { AppError } from "@/server/core/errors";
import { serialize } from "cookie";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body.token;
    if (!token) {
      return ApiResponse.error({
        message: TOKEN_MESSAGE.INVALID_TOKEN,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const userIdRaw = await TokenService.verifyResetPasswordToken(token);
    const userIdValidation = validateData(userIdRaw, ResetPasswordTokenPayloadSchema);
    if (!userIdValidation.success) {
      return userIdValidation.response;
    }
    const userId = userIdValidation.data.id;
    const token_version = userIdValidation.data.token_version;
    const user = await UserService.getUserById({ id: userId });
    if (!user) {
      throw new AppError({
        message: TOKEN_MESSAGE.INVALID_TOKEN,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }
    if (user.token_version !== token_version) {
      throw new AppError({
        message: TOKEN_MESSAGE.INVALID_TOKEN,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }
    const dataValidation = validateData(
      { password: body.password, id: userId },
      UpdatePasswordSchema
    );
    if (!dataValidation.success) {
      return dataValidation.response;
    }
    const data = dataValidation.data;
    await AuthService.updatePassword(data);
    await UserService.increaseTokenVersion({ id: userId });
    const cookie = [
      serialize("access_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/",
      }),
      serialize("refresh_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 0,
        path: "/api/auth/refresh-token",
      }),
    ].join(", ");
    const res = ApiResponse.success();
    res.headers.set("Set-Cookie", cookie);
    return res;
  } catch (error) {
    console.log(error);
    if (error instanceof AppError) {
      return ApiResponse.error({
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return ApiResponse.error();
  }
}
