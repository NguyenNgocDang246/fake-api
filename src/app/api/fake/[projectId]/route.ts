import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import IdConverter from "@/app/libs/helpers/idConverter";
export function GET(req: NextRequest) {
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const publicId = segments[0];
  const projectId = IdConverter.decode(publicId);
  const pathname = "/" + segments.slice(1).join("/");

  console.log({ publicId, projectId, pathname });
  return ApiResponse.success();
}
