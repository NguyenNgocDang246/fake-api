import { AppError } from "@/server/core/errors";
import { AI_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { toAiError } from "@/server/services/ai/ai_errors";

describe("toAiError", () => {
  it.each([
    [AI_MESSAGES.RATE_LIMITED, STATUS_CODE.TOO_MANY_REQUESTS],
    [AI_MESSAGES.PROVIDER_OVERLOADED, STATUS_CODE.SERVICE_UNAVAILABLE],
    [AI_MESSAGES.PROVIDER_TIMEOUT, STATUS_CODE.GATEWAY_TIMEOUT],
  ])("answers %j with a status the caller can act on", (message, expected) => {
    expect(toAiError(message, new Error("vendor said so")).statusCode).toBe(expected);
  });

  it.each([
    AI_MESSAGES.PROVIDER_AUTH_FAILED,
    AI_MESSAGES.MODEL_NOT_AVAILABLE,
    AI_MESSAGES.PROVIDER_REJECTED_REQUEST,
    AI_MESSAGES.PROVIDER_FAILED,
  ])("keeps %j a server error", (message) => {
    expect(toAiError(message, new Error("vendor said so")).statusCode).toBe(
      STATUS_CODE.SERVER_ERROR
    );
  });

  it("falls back to a server error for a message with no mapping", () => {
    expect(toAiError(AI_MESSAGES.NOT_CONFIGURED, new Error("x")).statusCode).toBe(
      STATUS_CODE.SERVER_ERROR
    );
  });

  it("carries the original error as cause", () => {
    const cause = new Error("model not found: claude-nope");
    const error = toAiError(AI_MESSAGES.MODEL_NOT_AVAILABLE, cause);

    expect(error).toBeInstanceOf(AppError);
    expect(error.message).toBe(AI_MESSAGES.MODEL_NOT_AVAILABLE);
    expect(error.cause).toBe(cause);
  });

  it("accepts a non-Error cause rather than dropping it", () => {
    expect(toAiError(AI_MESSAGES.PROVIDER_FAILED, "plain string").cause).toBe("plain string");
  });
});
