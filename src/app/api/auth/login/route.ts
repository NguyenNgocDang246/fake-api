import { LoginSchema } from "@/server/models/auth.model";
import { ErrorValidation, AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";
import authService from "@/server/services/auth/auth.service";

export async function POST(req: NextRequest) {
  try {
    const user = await req.json();
    const result = LoginSchema.safeParse(user);
    if (!result.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(result.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const data = await authService.login(result.data);
    return ApiResponse.success({ data });
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
