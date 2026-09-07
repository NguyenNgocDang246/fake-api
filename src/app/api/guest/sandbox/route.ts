import { NextRequest } from "next/server";
import ApiResponse from "@/server/core/api_response";
import { AppError } from "@/server/core/errors";
import { createRateLimiter } from "@/server/core/rate_limit";
import guestService from "@/server/services/guest.service";
import {
  GUEST_MESSAGES,
  GUEST_RATE_LIMIT_CALLS,
  GUEST_RATE_LIMIT_WINDOW_SECONDS,
} from "@/server/services/guest.constants";

const sandboxRateLimit = createRateLimiter({
  callsEnv: "GUEST_RATE_LIMIT_CALLS",
  windowEnv: "GUEST_RATE_LIMIT_WINDOW_SECONDS",
  fallbackCalls: GUEST_RATE_LIMIT_CALLS,
  fallbackWindowSeconds: GUEST_RATE_LIMIT_WINDOW_SECONDS,
  message: GUEST_MESSAGES.TOO_MANY_SANDBOXES,
});

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    sandboxRateLimit.consume(clientIp(req));
    const sandbox = await guestService.createSandbox();
    return ApiResponse.success({ data: sandbox });
  } catch (error) {
    if (error instanceof AppError) {
      return ApiResponse.error({ message: error.message, statusCode: error.statusCode });
    }
    return ApiResponse.error();
  }
}
