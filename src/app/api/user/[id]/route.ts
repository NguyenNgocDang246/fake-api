import UserService from "@/services/user.service";
import { getUserByIdSchema } from "@/models/user.model";
import { ErrorValidation } from "@/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/core/constants";
import ApiResponse from "@/core/api_response";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    return ApiResponse.success({ data: user });
  } catch (error) {
    console.log(error);
    return ApiResponse.error();
  }
}
