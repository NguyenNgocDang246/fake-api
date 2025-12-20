import { google } from "googleapis";
import { serialize } from "cookie";
import { oauth2Client } from "@/app/api/auth/google/google.OAuth2";
import { AppError } from "@/server/core/errors";
import {
  GOOGLE_AUTH_MESSAGES,
  STATUS_CODE,
  ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS,
  REFRESH_TOKEN_EXPIRATION_TIME_IN_SECONDS,
} from "@/server/core/constants";
import ApiResponse from "@/server/core/api_response";
import UserService from "@/server/services/user.service";
import AuthService from "@/server/services/auth/auth.service";
import { NextResponse } from "next/server";
import { PAGE_ROUTES, API_ROUTES } from "@/app/libs/routes";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return ApiResponse.error({
        message: GOOGLE_AUTH_MESSAGES.NO_CODE,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
    const { data } = await oauth2.userinfo.get();
    if (data.email == null) {
      return ApiResponse.error({
        message: GOOGLE_AUTH_MESSAGES.NO_EMAIL,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    if (data.name == null) {
      return ApiResponse.error({
        message: GOOGLE_AUTH_MESSAGES.NO_NAME,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }
    const existingUser = await UserService.getUserByEmail({ email: data.email });
    if (!existingUser) {
      await AuthService.registerWithGoogle({ name: data.name, email: data.email });
    }
    const tokenData = await AuthService.loginWithGoogle({ email: data.email });
    const cookie = [
      serialize("access_token", tokenData.access_token, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        maxAge: ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS,
        path: "/",
      }),
      serialize("refresh_token", tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "strict",
        maxAge: REFRESH_TOKEN_EXPIRATION_TIME_IN_SECONDS,
        path: API_ROUTES.AUTH.REFRESH_TOKEN,
      }),
    ].join(", ");
    const res = NextResponse.redirect(new URL(PAGE_ROUTES.PROJECT, req.url));
    res.headers.set("Set-Cookie", cookie);
    return res;
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
