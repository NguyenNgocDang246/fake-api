import { STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import {
  createMock,
  streamMock,
  FakeAPIError,
  FakeRateLimitError,
  FakeAuthenticationError,
  FakeNotFoundError,
  FakeBadRequestError,
  FakeConnectionTimeoutError,
  anthropicProvider,
  ANTHROPIC_DEFAULT_MODEL,
  slot,
  params,
} from "./harness";

describe("error mapping", () => {
  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  it("logs the vendor's own explanation, never the API key", async () => {
    createMock.mockRejectedValue(new FakeNotFoundError(404, "model not found"));

    await expect(anthropicProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.MODEL_NOT_AVAILABLE,
    });

    expect(consoleError).toHaveBeenCalledWith("[ai] anthropic request failed", {
      model: "claude-test",
      status: 404,
      detail: "model not found",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("sk-key");
  });

  it("reports a connection timeout as a gateway timeout", async () => {
    createMock.mockRejectedValue(new FakeConnectionTimeoutError(undefined, "request timed out"));

    await expect(anthropicProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_TIMEOUT,
      statusCode: STATUS_CODE.GATEWAY_TIMEOUT,
    });
  });

  it("reports a rate limit with a status the caller can act on", async () => {
    createMock.mockRejectedValue(new FakeRateLimitError(429));

    await expect(anthropicProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.RATE_LIMITED,
      statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
    });
  });

  it("reports a rejected key as a credential problem", async () => {
    createMock.mockRejectedValue(new FakeAuthenticationError(401));

    await expect(anthropicProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_AUTH_FAILED,
    });
  });

  it("reports a 404 as a model these credentials cannot reach", async () => {
    createMock.mockRejectedValue(new FakeNotFoundError(404));

    await expect(anthropicProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.MODEL_NOT_AVAILABLE,
    });
  });

  it("reports a 400 as a request the vendor will refuse on every key", async () => {
    createMock.mockRejectedValue(new FakeBadRequestError(400, "max_tokens: must be >= 1"));

    await expect(anthropicProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_REJECTED_REQUEST,
      statusCode: STATUS_CODE.SERVER_ERROR,
    });
  });

  it.each([500, 502, 529])("reports a %s as a transient overload", async (status) => {
    createMock.mockRejectedValue(new FakeAPIError(status));

    await expect(anthropicProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_OVERLOADED,
      statusCode: STATUS_CODE.SERVICE_UNAVAILABLE,
    });
  });

  it("wraps a non-SDK error rather than leaking it", async () => {
    createMock.mockRejectedValue(new Error("socket hang up"));

    await expect(anthropicProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_FAILED,
    });
  });

  it("carries the original error as cause for the logs", async () => {
    const original = new FakeRateLimitError(429);
    createMock.mockRejectedValue(original);

    await expect(anthropicProvider.chat(params, slot)).rejects.toMatchObject({
      cause: original,
    });
  });
});


describe("chatStream", () => {
  let consoleError: jest.SpyInstance;
  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => consoleError.mockRestore());

  it("yields text deltas and ignores every other event", async () => {
    streamMock.mockImplementation(async function* () {
      yield { type: "message_start" };
      yield { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "hmm" } };
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "he" } };
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "llo" } };
      yield { type: "message_stop" };
    });

    const chunks: string[] = [];
    for await (const chunk of anthropicProvider.chatStream!(params, slot)) chunks.push(chunk);

    expect(chunks).toEqual(["he", "llo"]);
  });

  it("maps a stream failure through the same error mapping", async () => {
    streamMock.mockImplementation(async function* () {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "a" } };
      throw new FakeRateLimitError(429);
    });

    await expect(
      (async () => {
        for await (const _chunk of anthropicProvider.chatStream!(params, slot)) void _chunk;
      })()
    ).rejects.toMatchObject({ message: AI_MESSAGES.RATE_LIMITED });
  });
});


describe("registration", () => {
  it("declares a default model the router can fall back to", () => {
    expect(anthropicProvider.name).toBe("anthropic");
    expect(anthropicProvider.defaultModel).toBe(ANTHROPIC_DEFAULT_MODEL);
  });
});
