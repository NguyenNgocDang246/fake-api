import { google } from "googleapis";
import { parse, serialize } from "cookie";
import { getOauth2Client } from "@/app/api/auth/google/google.OAuth2";
import { AppError } from "@/server/core/errors";
import { STATUS_CODE } from "@/server/core/constants";
import {
  GOOGLE_AUTH_MESSAGES,
  ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS,
  REFRESH_TOKEN_EXPIRATION_TIME_IN_SECONDS,
  OAUTH_STATE_COOKIE,
} from "@/server/services/auth/auth.constants";
import ApiResponse from "@/server/core/api_response";
import UserService from "@/server/services/user.service";
import AuthService from "@/server/services/auth/auth.service";
import { NextResponse } from "next/server";
import { PAGE_ROUTES } from "@/app/libs/routes";

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

    // Verify state before spending a token exchange on a request we did not start.
    const state = searchParams.get("state");
    const expectedState = parse(req.headers.get("cookie") ?? "")[OAUTH_STATE_COOKIE];
    if (!state || !expectedState || state !== expectedState) {
      return ApiResponse.error({
        message: GOOGLE_AUTH_MESSAGES.INVALID_STATE,
        statusCode: STATUS_CODE.BAD_REQUEST,
      });
    }

    const oauth2Client = getOauth2Client();
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
    const res = NextResponse.redirect(new URL(PAGE_ROUTES.PROJECT, req.url));
    res.headers.append(
      "Set-Cookie",
      serialize("access_token", tokenData.access_token, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        maxAge: ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS,
        path: "/",
      }),
    );
    res.headers.append(
      "Set-Cookie",
      serialize("refresh_token", tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        maxAge: REFRESH_TOKEN_EXPIRATION_TIME_IN_SECONDS,
        path: "/",
      }),
    );
    res.headers.append(
      "Set-Cookie",
      serialize(OAUTH_STATE_COOKIE, "", {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      }),
    );
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
