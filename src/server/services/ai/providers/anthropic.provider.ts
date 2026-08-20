import Anthropic from "@anthropic-ai/sdk";
import { AppError } from "@/server/core/errors";
import { AI_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import {
  AiChatParams,
  AiChatResult,
  AiProvider,
  AiSlot,
  AiUsage,
  toSystemBlocks,
} from "@/server/services/ai/ai.types";

export const ANTHROPIC_PROVIDER_NAME = "anthropic";
export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5";

function buildRequest(params: AiChatParams, slot: AiSlot) {
  const blocks = toSystemBlocks(params.system);

  return {
    model: slot.model,
    max_tokens: params.maxTokens,
    // Adaptive thinking is the only mode on current models; budget_tokens was removed.
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
            // The cache breakpoint sits on the marked block; varying content comes after.
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

/** Join every text block into one string, ignoring thinking blocks. */
function readText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * Normalize an SDK failure into an `AppError`.
 *
 * The message on the returned error is user-facing and therefore vague, so the real cause
 * is logged here and attached as `cause`. Without that, a wrong model name and a revoked
 * key look identical in the logs. The API key is never logged.
 */
function toAppError(error: unknown, slot: AiSlot): AppError {
  if (error instanceof AppError) return error;

  console.error("[ai] anthropic request failed", {
    model: slot.model,
    status: error instanceof Anthropic.APIError ? error.status : "none",
    detail: error instanceof Error ? error.message : String(error),
  });

  const message = (() => {
    if (error instanceof Anthropic.RateLimitError) return AI_MESSAGES.RATE_LIMITED;
    if (error instanceof Anthropic.AuthenticationError) return AI_MESSAGES.PROVIDER_AUTH_FAILED;
    if (error instanceof Anthropic.NotFoundError) return AI_MESSAGES.MODEL_NOT_AVAILABLE;
    // 529 overloaded, plus the 5xx range: transient, so the router is allowed to retry.
    if (error instanceof Anthropic.APIError && typeof error.status === "number") {
      if (error.status >= STATUS_CODE.SERVER_ERROR) return AI_MESSAGES.PROVIDER_OVERLOADED;
    }
    return AI_MESSAGES.PROVIDER_FAILED;
  })();

  return new AppError({ message, cause: error });
}

const anthropicProvider: AiProvider = {
  name: ANTHROPIC_PROVIDER_NAME,
  defaultModel: ANTHROPIC_DEFAULT_MODEL,

  async chat(params, slot): Promise<AiChatResult> {
    try {
      const client = new Anthropic({ apiKey: slot.apiKey });
      const response = await client.messages.create(buildRequest(params, slot));

      const usage = readUsage(response.usage);

      return {
        text: readText(response.content),
        provider: slot.provider,
        model: response.model,
        ...(usage ? { usage } : {}),
      };
    } catch (error) {
      throw toAppError(error, slot);
    }
  },

  async *chatStream(params, slot): AsyncIterable<string> {
    // Unused by the variant feature (the pool is built in the background, so nothing to
    // stream). It exists so a chatbox can use it later without reshaping the interface and
    // forcing every provider to be rewritten.
    try {
      const client = new Anthropic({ apiKey: slot.apiKey });
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
