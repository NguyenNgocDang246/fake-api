import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import MailService from "@/server/services/mail/mail.service";
import UserService from "@/server/services/user.service";
import { AppError } from "@/server/core/errors";
import { GetUserByEmailSchema } from "@/models/user.model";
import TokenService from "@/server/services/auth/token.service";
import { validateData } from "@/server/core/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const emailRaw = body.email;
    const emailValidation = validateData({ email: emailRaw }, GetUserByEmailSchema);
    if (!emailValidation.success) {
      return emailValidation.response;
    }
    const email = emailValidation.data.email;
    const user = await UserService.getUserByEmail({ email });
    if (!user) {
      return ApiResponse.success(); // the same answer either way, so this never confirms an account
    }
    if (user.is_verified == false) return ApiResponse.success();
    const token = await TokenService.createResetPasswordToken({
      public_id: user.public_id,
      token_version: user.token_version,
    });
    await MailService.sendForgotPasswordEmail({
      to: email,
      token: token,
    });
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
