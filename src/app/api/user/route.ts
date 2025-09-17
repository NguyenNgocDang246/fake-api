import UserService from "@/server/services/user.service";
import { GetUserByIdSchema, UserInfoSchema } from "@/models/user.model";
import { AppError } from "@/server/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ id });
    const user = await UserService.getUserById(userId);
    if (user === null)
      return ApiResponse.error({
        message: ERROR_MESSAGES.UNAUTHORIZED,
        statusCode: STATUS_CODE.UNAUTHORIZED,
      });
    const userInfo = UserInfoSchema.parse({
      id: user.id,
      name: user.name,
      email: user.email,
    });
    return ApiResponse.success({ data: userInfo });
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
