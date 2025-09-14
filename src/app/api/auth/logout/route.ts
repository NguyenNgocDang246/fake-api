import { NextRequest } from "next/server";
import { serialize } from "cookie";
import ApiResponse from "@/server/core/api_response";

export async function GET(req: NextRequest) {
  void req;
  const cookie = [
    serialize("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    }),
    serialize("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/api/auth/refresh-token",
    }),
  ].join(", ");
  const res = ApiResponse.success();
  res.headers.set("Set-Cookie", cookie);
  return res;
}
