import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
export async function GET(req: NextRequest) {
  void req;
  return ApiResponse.success();
}
