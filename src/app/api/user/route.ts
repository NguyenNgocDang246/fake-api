import UserService from "@/services/user.service";
import { CreateUserSchema } from "@/models/user.model";
import { ErrorValidation } from "@/core/errors";
import { ERROR_MESSAGES, STATUS_CODE } from "@/core/constants";
import ApiResponse from "@/core/api_response";
import { NextRequest } from "next/server";

export async function GET() {
  try {
    const users = await UserService.getAllUsers();
    if (users.length === 0)
      return ApiResponse.error({
        message: ERROR_MESSAGES.NO_CONTENT,
        statusCode: STATUS_CODE.NO_CONTENT,
      });
    return ApiResponse.success({ data: users });
  } catch (error) {
    console.log(error);
    return ApiResponse.error();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await req.json();
    const result = CreateUserSchema.safeParse(user);
    if (!result.success) {
      return ApiResponse.error({
        errors: ErrorValidation.fromZodError(result.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const createdUser = await UserService.createUser(result.data);
    return ApiResponse.success({
      data: createdUser,
      statusCode: STATUS_CODE.CREATED,
    });
  } catch (error) {
    console.log(error);
    return ApiResponse.error();
  }
}
