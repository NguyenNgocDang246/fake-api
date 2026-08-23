const createMock = jest.fn();
const streamMock = jest.fn();

class FakeAPIError extends Error {
  status: number | undefined;
  constructor(status?: number, message?: string) {
    super(message ?? `api error ${status}`);
    this.status = status;
  }
}
class FakeRateLimitError extends FakeAPIError {}
class FakeAuthenticationError extends FakeAPIError {}
class FakeNotFoundError extends FakeAPIError {}
class FakeBadRequestError extends FakeAPIError {}
class FakeConnectionTimeoutError extends FakeAPIError {}

const AnthropicMock = Object.assign(
  jest.fn().mockImplementation(() => ({
    messages: { create: createMock, stream: streamMock },
  })),
  {
    APIError: FakeAPIError,
    RateLimitError: FakeRateLimitError,
    AuthenticationError: FakeAuthenticationError,
    NotFoundError: FakeNotFoundError,
    BadRequestError: FakeBadRequestError,
    APIConnectionTimeoutError: FakeConnectionTimeoutError,
  }
);

jest.mock("@anthropic-ai/sdk", () => ({ __esModule: true, default: AnthropicMock }));

import anthropicProvider, {
  ANTHROPIC_DEFAULT_MODEL,
} from "@/server/services/ai/providers/anthropic.provider";
import { AI_MESSAGES, AI_REQUEST_TIMEOUT_MS, STATUS_CODE } from "@/server/core/constants";
import type { AiChatParams, AiSlot } from "@/server/services/ai/ai.types";

const slot: AiSlot = { provider: "anthropic", model: "claude-test", apiKey: "sk-key" };

const params: AiChatParams = {
  system: "be terse",
  messages: [{ role: "user", content: "hello" }],
  maxTokens: 500,
};

const textReply = (text: string, extra: Record<string, unknown> = {}) => ({
  content: [{ type: "text", text }],
  model: "claude-test-20990101",
  ...extra,
});

function request() {
  return createMock.mock.calls[0][0];
}

beforeEach(() => {
  createMock.mockReset();
  streamMock.mockReset();
  AnthropicMock.mockClear();
  createMock.mockResolvedValue(textReply("{}"));
});

describe("client configuration", () => {
  it("sets its own deadline and leaves retrying to the router", async () => {
    await anthropicProvider.chat(params, slot);

    expect(AnthropicMock).toHaveBeenCalledWith({
      apiKey: "sk-key",
      maxRetries: 0,
      timeout: AI_REQUEST_TIMEOUT_MS,
    });
  });
});

describe("request mapping", () => {
  it("passes the slot's model and token budget through", async () => {
    await anthropicProvider.chat(params, slot);

    expect(request().model).toBe("claude-test");
    expect(request().max_tokens).toBe(500);
  });

  it("defaults effort to low and asks for adaptive thinking", async () => {
    await anthropicProvider.chat(params, slot);

    expect(request().output_config.effort).toBe("low");
    expect(request().thinking).toEqual({ type: "adaptive" });
  });

  it("carries an explicit effort instead of the default", async () => {
    await anthropicProvider.chat({ ...params, effort: "high" }, slot);

    expect(request().output_config.effort).toBe("high");
  });

  it("asks for structured output only when a schema is supplied", async () => {
    await anthropicProvider.chat(params, slot);
    expect(request().output_config).not.toHaveProperty("format");

    createMock.mockClear();
    const jsonSchema = { type: "object" as const };
    await anthropicProvider.chat({ ...params, jsonSchema }, slot);

    expect(request().output_config.format).toEqual({ type: "json_schema", schema: jsonSchema });
  });

  it("puts a cache breakpoint on the block that asked for one", async () => {
    await anthropicProvider.chat(
      {
        ...params,
        system: [{ text: "stable rules" }, { text: "endpoint context", cacheable: true }],
      },
      slot
    );

    expect(request().system).toEqual([
      { type: "text", text: "stable rules" },
      {
        type: "text",
        text: "endpoint context",
        cache_control: { type: "ephemeral" },
      },
    ]);
  });

  it("omits system entirely when there is no system prompt", async () => {
    const noSystem: AiChatParams = { messages: params.messages, maxTokens: params.maxTokens };
    await anthropicProvider.chat(noSystem, slot);

    expect(request()).not.toHaveProperty("system");
  });
});

describe("response mapping", () => {
  it("joins text blocks and ignores thinking blocks", async () => {
    createMock.mockResolvedValue({
      content: [
        { type: "thinking", thinking: "let me consider" },
        { type: "text", text: '{"variants":' },
        { type: "text", text: "[]}" },
      ],
      model: "claude-test-20990101",
    });

    await expect(anthropicProvider.chat(params, slot)).resolves.toMatchObject({
      text: '{"variants":[]}',
    });
  });

  it("reports the model the vendor says answered, not the one requested", async () => {
    await expect(anthropicProvider.chat(params, slot)).resolves.toMatchObject({
      provider: "anthropic",
      model: "claude-test-20990101",
    });
  });

  it("reports usage including the cache counters", async () => {
    createMock.mockResolvedValue(
      textReply("{}", {
        usage: {
          input_tokens: 120,
          output_tokens: 30,
          cache_read_input_tokens: 100,
          cache_creation_input_tokens: 40,
        },
      })
    );

    await expect(anthropicProvider.chat(params, slot)).resolves.toMatchObject({
      usage: {
        inputTokens: 120,
        outputTokens: 30,
        cacheReadTokens: 100,
        cacheWriteTokens: 40,
      },
    });
  });

  it("reports a truncated answer as max_tokens", async () => {
    createMock.mockResolvedValue(textReply('{"variants":[{"a"', { stop_reason: "max_tokens" }));

    await expect(anthropicProvider.chat(params, slot)).resolves.toMatchObject({
      stopReason: "max_tokens",
    });
  });

  it.each(["end_turn", "stop_sequence"])("reports %s as a complete answer", async (reason) => {
    createMock.mockResolvedValue(textReply("{}", { stop_reason: reason }));

    await expect(anthropicProvider.chat(params, slot)).resolves.toMatchObject({
      stopReason: "stop",
    });
  });

  it("collapses any other stop reason to other rather than guessing", async () => {
    createMock.mockResolvedValue(textReply("", { stop_reason: "refusal" }));

    await expect(anthropicProvider.chat(params, slot)).resolves.toMatchObject({
      stopReason: "other",
    });
  });

  it("omits stopReason when the provider did not report one", async () => {
    const result = await anthropicProvider.chat(params, slot);

    expect(result).not.toHaveProperty("stopReason");
  });
});

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
