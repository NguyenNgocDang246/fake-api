import UserService from "@/services/user.service";
import { getUserByIdSchema } from "@/models/user.model";
import { ErrorValidation } from "@/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/core/constants";
import ApiResponse from "@/core/api_response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const id = req.headers.get("x-user-id");
    const result = getUserByIdSchema.safeParse({ id });
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
    console.log(error);
    return ApiResponse.error();
  }
}
