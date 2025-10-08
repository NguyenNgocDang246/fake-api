import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import MailService from "@/server/services/mail.service";
import UserService from "@/server/services/user.service";
import { AppError } from "@/server/core/errors";
import { GetUserByEmailSchema } from "@/models/user.model";
import TokenService from "@/server/services/auth/token.service";
import { DOMAIN, PAGE_ROUTES } from "@/app/libs/routes";
import { validateData } from "@/server/core/validation";
import { STATUS_CODE, AUTH_MESSAGES } from "@/server/core/constants";

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
      return ApiResponse.error({
        statusCode: STATUS_CODE.NO_CONTENT,
        message: AUTH_MESSAGES.USER_NOT_FOUND,
      });
    }
    const token = await TokenService.createResetPasswordToken({
      id: user.id,
      token_version: user.token_version,
    });
    const data = await MailService.sendEmail({
      to: email,
      subject: "Forgot Password",
      html: `<a href="${DOMAIN}${PAGE_ROUTES.AUTH.PASSWORD.RESET}?token=${token}">Reset Password</a>`,
    });
    return ApiResponse.success(data);
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
