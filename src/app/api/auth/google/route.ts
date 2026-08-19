import { serialize } from "cookie";
import { getOauth2Client } from "@/app/api/auth/google/google.OAuth2";
import ApiResponse from "@/server/core/api_response";
import { LoginWithGoogleResponseDTO } from "@/models/auth.model";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_EXPIRATION_TIME_IN_SECONDS,
} from "@/server/core/constants";

export async function GET() {
  try {
    // The state is echoed back by Google on the callback and compared against this
    // cookie, so a callback the user never initiated cannot log them in (CSRF).
    const state = crypto.randomUUID();

    const url = getOauth2Client().generateAuthUrl({
      access_type: "offline",
      scope: ["profile", "email"],
      state,
    });

    const data: LoginWithGoogleResponseDTO = { url };

    const res = ApiResponse.success({ data });
    res.headers.append(
      "Set-Cookie",
      serialize(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        maxAge: OAUTH_STATE_EXPIRATION_TIME_IN_SECONDS,
        path: "/",
      }),
    );
    return res;
  } catch (error) {
    void error;
    return ApiResponse.error();
  }
}
