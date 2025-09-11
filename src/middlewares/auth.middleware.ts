import { NextRequest, NextResponse } from "next/server";
import TokenService from "@/services/auth/token.service";
import ApiResponse from "@/core/api_response";
import { STATUS_CODE, TOKEN_MESSAGE } from "@/core/constants";
import { AppError } from "@/core/errors";

const authMiddleware = async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return ApiResponse.error({
      message: TOKEN_MESSAGE.INVALID_TOKEN,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }
  const accessToken = authHeader.replace("Bearer ", "");
  if (!accessToken) {
    return ApiResponse.error({
      message: TOKEN_MESSAGE.INVALID_TOKEN,
      statusCode: STATUS_CODE.BAD_REQUEST,
    });
  }

  try {
    const payload = await TokenService.verifyAccessToken(accessToken);
    // console.log(payload);
    const res = NextResponse.next();
    res.headers.set("x-user-id", `${payload.id}`);
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
};

export default authMiddleware;
