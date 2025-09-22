import { RegisterSchema } from "@/models/auth.model";
import { AppError } from "@/server/core/errors";
import { validateData } from "@/server/core/validation";
import ApiResponse from "@/server/core/api_response";
import { NextRequest } from "next/server";
import authService from "@/server/services/auth/auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateData(body, RegisterSchema);
    if (!validation.success) {
      return validation.response;
    }
    const user = validation.data;
    const registeredUser = await authService.register(user);
    return ApiResponse.success({ data: registeredUser });
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
