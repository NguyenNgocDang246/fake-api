import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { GetUserByIdSchema } from "@/models/user.model";
import { AppError } from "@/server/core/errors";
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ projectId: string; endpointGroupId: string }> }
) {
  try {
    const id = req.headers.get("x-userId");
    const userId = GetUserByIdSchema.parse({ id }).id;

    const params = await props.params;
    const projectIdRaw = params.projectId;
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
