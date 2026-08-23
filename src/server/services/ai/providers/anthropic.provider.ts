import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "@/server/core/errors";
import { AI_MESSAGES, AI_REQUEST_TIMEOUT_MS, STATUS_CODE } from "@/server/core/constants";
import { toAiError } from "@/server/services/ai/ai_errors";
import {
  AiChatParams,
  AiChatResult,
  AiProvider,
  AiSlot,
  AiStopReason,
  AiUsage,
  toSystemBlocks,
} from "@/server/services/ai/ai.types";

export const ANTHROPIC_PROVIDER_NAME = "anthropic";
export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5";

// `maxRetries: 0` because retrying is the router's job, and the SDK would otherwise make one
// call worth up to three timeouts, which the router then multiplies by `MAX_ATTEMPTS` again.
function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, maxRetries: 0, timeout: AI_REQUEST_TIMEOUT_MS });
}

function buildRequest(params: AiChatParams, slot: AiSlot) {
  const blocks = toSystemBlocks(params.system);

  return {
    model: slot.model,
    max_tokens: params.maxTokens,
    thinking: { type: "adaptive" as const },
    output_config: {
      effort: params.effort ?? ("low" as const),
      ...(params.jsonSchema
        ? { format: { type: "json_schema" as const, schema: params.jsonSchema } }
        : {}),
    },
    ...(blocks.length > 0
      ? {
          system: blocks.map((block) => ({
            type: "text" as const,
            text: block.text,
            ...(block.cacheable ? { cache_control: { type: "ephemeral" as const } } : {}),
          })),
        }
      : {}),
    messages: params.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}

function readUsage(usage: Anthropic.Usage | undefined): AiUsage | undefined {
  if (!usage) return undefined;

  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  };
}

function readStopReason(stopReason: Anthropic.Message["stop_reason"]): AiStopReason | undefined {
  if (!stopReason) return undefined;
  if (stopReason === "max_tokens") return "max_tokens";
  return stopReason === "end_turn" || stopReason === "stop_sequence" ? "stop" : "other";
}

function readText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

function toAppError(error: unknown, slot: AiSlot): AppError {
  if (error instanceof AppError) return error;

  console.error("[ai] anthropic request failed", {
    model: slot.model,
    status: error instanceof Anthropic.APIError ? error.status : "none",
    detail: error instanceof Error ? error.message : String(error),
  });

  const message = (() => {
    if (error instanceof Anthropic.APIConnectionTimeoutError) return AI_MESSAGES.PROVIDER_TIMEOUT;
    if (error instanceof Anthropic.RateLimitError) return AI_MESSAGES.RATE_LIMITED;
    if (error instanceof Anthropic.AuthenticationError) return AI_MESSAGES.PROVIDER_AUTH_FAILED;
    if (error instanceof Anthropic.NotFoundError) return AI_MESSAGES.MODEL_NOT_AVAILABLE;
    if (error instanceof Anthropic.BadRequestError) return AI_MESSAGES.PROVIDER_REJECTED_REQUEST;
    if (error instanceof Anthropic.APIError && typeof error.status === "number") {
      if (error.status >= STATUS_CODE.SERVER_ERROR) return AI_MESSAGES.PROVIDER_OVERLOADED;
    }
    return AI_MESSAGES.PROVIDER_FAILED;
  })();

  return toAiError(message, error);
}

const anthropicProvider: AiProvider = {
  name: ANTHROPIC_PROVIDER_NAME,
  defaultModel: ANTHROPIC_DEFAULT_MODEL,

  async chat(params, slot): Promise<AiChatResult> {
    try {
      const client = createClient(slot.apiKey);
      const response = await client.messages.create(buildRequest(params, slot));

      const usage = readUsage(response.usage);
      const stopReason = readStopReason(response.stop_reason);

      return {
        text: readText(response.content),
        provider: slot.provider,
        model: response.model,
        ...(stopReason ? { stopReason } : {}),
        ...(usage ? { usage } : {}),
      };
    } catch (error) {
      throw toAppError(error, slot);
    }
  },

  async *chatStream(params, slot): AsyncIterable<string> {
    try {
      const client = createClient(slot.apiKey);
      const stream = client.messages.stream(buildRequest(params, slot));

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
    } catch (error) {
      throw toAppError(error, slot);
    }
  },
};

export default anthropicProvider;
