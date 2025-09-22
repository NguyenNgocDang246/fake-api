import { serialize } from "cookie";
import { LoginSchema } from "@/models/auth.model";
import { AppError } from "@/server/core/errors";
import { validateData } from "@/server/core/validation";
import {
  ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS,
  REFRESH_TOKEN_EXPIRATION_TIME_IN_SECONDS,
} from "@/server/core/constants";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";
import authService from "@/server/services/auth/auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateData(body, LoginSchema);
    if (!validation.success) {
      return validation.response;
    }
    const user = validation.data;
    const data = await authService.login(user);
    const cookie = [
      serialize("access_token", data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS,
        path: "/",
      }),
      serialize("refresh_token", data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: REFRESH_TOKEN_EXPIRATION_TIME_IN_SECONDS,
        path: "/api/auth/refresh-token",
      }),
    ].join(", ");
    const res = ApiResponse.success();
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
