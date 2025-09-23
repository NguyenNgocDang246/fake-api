import { RegisterSchema } from "@/models/auth.model";
import { AppError } from "@/server/core/errors";
import { validateData } from "@/server/core/validation";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";
import authService from "@/server/services/auth/auth.service";
import { UserInfoSchema } from "@/models/user.model";
import IdConverter from "@/app/libs/helpers/idConverter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateData(body, RegisterSchema);
    if (!validation.success) {
      return validation.response;
    }
    const user = validation.data;
    const registeredUser = await authService.register(user);
    const userInfoValidation = validateData(
      {
        public_id: IdConverter.encode(registeredUser.id),
        name: registeredUser.name,
        email: registeredUser.email,
      },
      UserInfoSchema
    );
    if (!userInfoValidation.success) {
      return userInfoValidation.response;
    }
    const userInfo = userInfoValidation.data;
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
