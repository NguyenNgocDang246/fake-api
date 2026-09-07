import { AI_REQUEST_TIMEOUT_MS } from "@/server/services/ai/ai.constants";
import type { AiChatParams } from "@/server/services/ai/ai.types";
import {
  createMock,
  AnthropicMock,
  anthropicProvider,
  slot,
  params,
  textReply,
  request,
} from "./harness";

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
