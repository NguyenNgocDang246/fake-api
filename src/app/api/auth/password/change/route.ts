import { NextRequest } from "next/server";
import { ChangePasswordSchema } from "@/models/user.model";
import { validateData } from "@/server/core/validation";
import ApiResponse from "@/server/core/api_response";
import { AUTH_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { verifyPassword } from "@/server/services/auth/hash.service";
import UserService from "@/server/services/user.service";
import AuthService from "@/server/services/auth/auth.service";
import { AppError } from "@/server/core/errors";

export async function POST(req: NextRequest) {
  try {
    const public_id = req.headers.get("x-userId");
    const body = await req.json();
    const dataValidation = validateData(
      { public_id, oldPassword: body.oldPassword, newPassword: body.newPassword },
      ChangePasswordSchema
    );
    if (!dataValidation.success) {
      return dataValidation.response;
    }
    const data = dataValidation.data;

    const user = await UserService.getUserById({ public_id: data.public_id });
    if (!user) {
      throw new AppError({
        message: AUTH_MESSAGES.USER_NOT_FOUND,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }

    const isValid = await verifyPassword(data.oldPassword, user.password);
    if (!isValid) {
      throw new AppError({
        message: AUTH_MESSAGES.INVALID_CURRENT_PASSWORD,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    }

    await AuthService.updatePassword({ public_id: data.public_id, password: data.newPassword });
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
