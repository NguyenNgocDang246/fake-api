import { NextRequest } from "next/server";
import { VerifyEmailTokenPayloadSchema } from "@/models/auth.model";
import { validateData } from "@/server/core/validation";
import ApiResponse from "@/server/core/api_response";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/server/core/constants";
import TokenService from "@/server/services/auth/token.service";
import UserService from "@/server/services/user.service";
import { AppError } from "@/server/core/errors";

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
    const payload = await TokenService.verifyVerifyEmailToken(token);
    const payloadValidation = validateData(payload, VerifyEmailTokenPayloadSchema);
    if (!payloadValidation.success) {
      return payloadValidation.response;
    }
    const userId = payloadValidation.data.id;
    const token_version = payloadValidation.data.token_version;
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

    await UserService.verifyUserEmail({ id: userId });
    await UserService.increaseTokenVersion({ id: userId });
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
