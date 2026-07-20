import { NextRequest } from "next/server";
import { AppError } from "@/server/core/errors";
import { validateData } from "@/server/core/validation";
import { GetUserByEmailSchema } from "@/models/user.model";
import ApiResponse from "@/server/core/api_response";
import MailService from "@/server/services/mail/mail.service";
import TokenService from "@/server/services/auth/token.service";
import UserService from "@/server/services/user.service";

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
      return ApiResponse.success();
    }
    if (user.is_verified == true) return ApiResponse.success();

    const verifyEmailToken = await TokenService.createVerifyEmailToken({
      public_id: user.public_id,
      token_version: user.token_version,
    });
    await MailService.sendVerificationEmail({
      to: email,
      token: verifyEmailToken,
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
