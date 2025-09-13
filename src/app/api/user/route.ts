import UserService from "@/server/services/user.service";
import { GetUserByIdSchema } from "@/server/models/user.model";
import { ErrorValidation, AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const id = req.headers.get("x-user-id");
    const result = GetUserByIdSchema.safeParse({ id });
    if (!result.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(result.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const user = await UserService.getUserById(result.data);
    if (user === null)
      return ApiResponse.error({
        message: ERROR_MESSAGES.UNAUTHORIZED,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    return ApiResponse.success({ data: user });
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
