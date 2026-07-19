import { NextRequest } from "next/server";
import { serialize } from "cookie";
import ApiResponse from "@/server/core/api_response";
import { API_ROUTES } from "@/app/libs/routes";

export async function GET(req: NextRequest) {
  void req;
  const res = ApiResponse.success();
  res.headers.append(
    "Set-Cookie",
    serialize("access_token", "", {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    }),
  );
  res.headers.append(
    "Set-Cookie",
    serialize("refresh_token", "", {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    }),
  );
  // Clean up any stale refresh_token cookie set under the pre-fix path (see 4411dc9).
  res.headers.append(
    "Set-Cookie",
    serialize("refresh_token", "", {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      maxAge: 0,
      path: API_ROUTES.AUTH.REFRESH_TOKEN,
    }),
  );
  return res;
}
