import { NextRequest } from "next/server";
import { serialize } from "cookie";
import ApiResponse from "@/server/core/api_response";

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
  return res;
}
