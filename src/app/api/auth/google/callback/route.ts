import { google } from "googleapis";
import { oauth2Client } from "@/app/api/auth/google/google.OAuth2";
import { NextResponse } from "next/server";
import { PAGE_ROUTES } from "@/app/libs/routes";
import { GOOGLE_AUTH_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import ApiResponse from "@/server/core/api_response";

export async function GET(req: Request) {
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

  const appToken = JSON.stringify(data);
  console.log(appToken);

  const res = NextResponse.redirect(new URL(PAGE_ROUTES.HOME, req.url));
  res.cookies.set("appToken", appToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
  });

  return res;
}
