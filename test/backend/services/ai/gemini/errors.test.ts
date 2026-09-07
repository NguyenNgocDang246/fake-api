import { STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import {
  generateContentMock,
  generateContentStreamMock,
  FakeApiError,
  geminiProvider,
  GEMINI_DEFAULT_MODEL,
  slot,
  params,
} from "./harness";

describe("error mapping", () => {
  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  it("logs the provider's own explanation, never the API key", async () => {
    generateContentMock.mockRejectedValue(new FakeApiError(404));

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.MODEL_NOT_AVAILABLE,
    });

    expect(consoleError).toHaveBeenCalledWith("[ai] gemini request failed", {
      model: "gemini-test",
      status: 404,
      detail: "api error 404",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("gm-key");
  });

  it("attaches the original error as cause so the caller can log it", async () => {
    const original = new FakeApiError(404);
    generateContentMock.mockRejectedValue(original);

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.MODEL_NOT_AVAILABLE,
      cause: original,
    });
  });

  it.each([502, 503, 504])("reports a %s as a transient overload", async (status) => {
    generateContentMock.mockRejectedValue(new FakeApiError(status));

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_OVERLOADED,
    });
  });

  it("reports a 429 as rate limiting", async () => {
    generateContentMock.mockRejectedValue(new FakeApiError(429));

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.RATE_LIMITED,
    });
  });

  it.each([401, 403])("reports a %s as a credential problem", async (status) => {
    generateContentMock.mockRejectedValue(new FakeApiError(status));

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_AUTH_FAILED,
    });
  });

  it.each([
    "API key not valid. Please pass a valid API key.",
    "Request had invalid authentication credentials.",
  ])("reads a 400 saying %j as a credential problem", async (detail) => {
    const error = new FakeApiError(400);
    error.message = detail;
    generateContentMock.mockRejectedValue(error);

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_AUTH_FAILED,
    });
  });

  it("reads any other 400 as a request the vendor will refuse on every key", async () => {
    const error = new FakeApiError(400);
    error.message = "Invalid JSON payload received. Unknown name 'responseJsonSchema'.";
    generateContentMock.mockRejectedValue(error);

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_REJECTED_REQUEST,
      statusCode: STATUS_CODE.SERVER_ERROR,
    });
  });

  it("reports a 500 as a transient overload, not a generic failure", async () => {
    generateContentMock.mockRejectedValue(new FakeApiError(500));

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_OVERLOADED,
      statusCode: STATUS_CODE.SERVICE_UNAVAILABLE,
    });
  });

  it("reports a status outside the mapped ranges as a generic provider failure", async () => {
    generateContentMock.mockRejectedValue(new FakeApiError(418));

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_FAILED,
    });
  });

  it("wraps a non-SDK error rather than leaking it", async () => {
    generateContentMock.mockRejectedValue(new Error("socket hang up"));

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_FAILED,
    });
  });

  it.each(["AbortError", "TimeoutError"])(
    "reports a %s from the request deadline as a timeout",
    async (name) => {
      const aborted = new Error("The operation was aborted.");
      aborted.name = name;
      generateContentMock.mockRejectedValue(aborted);

      await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
        message: AI_MESSAGES.PROVIDER_TIMEOUT,
        statusCode: STATUS_CODE.GATEWAY_TIMEOUT,
      });
    }
  );

  it("reports a 429 with the status our own limiter uses, so they read alike", async () => {
    generateContentMock.mockRejectedValue(new FakeApiError(429));

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.RATE_LIMITED,
      statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
    });
  });
});


describe("chatStream", () => {
  it("yields chunk text and skips empty chunks", async () => {
    generateContentStreamMock.mockResolvedValue(
      (async function* () {
        yield { text: "he" };
        yield { text: undefined };
        yield { text: "llo" };
      })()
    );

    const chunks: string[] = [];
    for await (const chunk of geminiProvider.chatStream!(params, slot)) chunks.push(chunk);

    expect(chunks).toEqual(["he", "llo"]);
  });

  it("maps a stream failure through the same error mapping", async () => {
    generateContentStreamMock.mockRejectedValue(new FakeApiError(429));

    await expect(
      (async () => {
        for await (const _ of geminiProvider.chatStream!(params, slot)) void _;
      })()
    ).rejects.toMatchObject({ message: AI_MESSAGES.RATE_LIMITED });
  });
});


describe("registration", () => {
  it("declares a default model the router can fall back to", () => {
    expect(geminiProvider.name).toBe("gemini");
    expect(geminiProvider.defaultModel).toBe(GEMINI_DEFAULT_MODEL);
    expect(GEMINI_DEFAULT_MODEL).toMatch(/^gemini-/);
  });
});
