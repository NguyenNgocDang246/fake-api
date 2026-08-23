import { RegisterSchema } from "@/models/auth.model";
import { AppError } from "@/server/core/errors";
import { validateData } from "@/server/core/validation";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";
import authService from "@/server/services/auth/auth.service";
import UserService from "@/server/services/user.service";
import MailService from "@/server/services/mail/mail.service";
import TokenService from "@/server/services/auth/token.service";
import { UserInfoSchema } from "@/models/user.model";
import { STATUS_CODE } from "@/server/core/constants";
import { AUTH_MESSAGES } from "@/server/services/auth/auth.constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateData(body, RegisterSchema);
    if (!validation.success) {
      return validation.response;
    }
    const user = validation.data;
    const existingUser = await UserService.getUserByEmail({ email: user.email });
    if (existingUser) {
      return ApiResponse.error({
        message: AUTH_MESSAGES.EMAIL_DUPLICATED,
        statusCode: STATUS_CODE.CONFLICT,
      });
    }
    const registeredUser = await authService.register(user);
    // send verify email
    const verifyEmailToken = await TokenService.createVerifyEmailToken({
      public_id: registeredUser.public_id,
      token_version: registeredUser.token_version,
    });
    await MailService.sendVerificationEmail({
      to: user.email,
      token: verifyEmailToken,
    });
    const userInfoValidation = validateData(
      {
        public_id: registeredUser.public_id,
        name: registeredUser.name,
        email: registeredUser.email,
        role: registeredUser.role,
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
