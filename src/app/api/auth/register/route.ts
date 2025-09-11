import { RegisterSchema } from "@/models/auth.model";
import { ErrorValidation, AppError } from "@/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/core/constants";
import ApiResponse from "@/core/api_response";
import { NextRequest } from "next/server";
import authService from "@/services/auth/auth.service";

export async function POST(req: NextRequest) {
  try {
    const user = await req.json();
    const result = RegisterSchema.safeParse(user);
    if (!result.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(result.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const registeredUser = await authService.register(result.data);
    return ApiResponse.success({ data: registeredUser });
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
