import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";
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

export const GEMINI_PROVIDER_NAME = "gemini";
export const GEMINI_DEFAULT_MODEL = "gemini-3.7-flash";

const THINKING_LEVELS: Record<NonNullable<AiChatParams["effort"]>, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

function buildRequest(params: AiChatParams, slot: AiSlot): GenerateContentParameters {
  // Gemini caches context through a separate `caches` API rather than an inline flag, so
  // the `cacheable` marker is ignored here. The contract allows that: the result is still
  // correct, just not discounted.
  const systemInstruction = toSystemBlocks(params.system)
    .map((block) => block.text)
    .join("\n\n");

  return {
    model: slot.model,
    contents: params.messages.map((message) => ({
      // Gemini names the assistant turn "model"; every other role maps to "user".
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    config: {
      maxOutputTokens: params.maxTokens,
      thinkingConfig: { thinkingLevel: THINKING_LEVELS[params.effort ?? "low"] },
      ...(systemInstruction ? { systemInstruction } : {}),
      ...(params.jsonSchema
        ? { responseMimeType: "application/json", responseJsonSchema: params.jsonSchema }
        : {}),
    },
  };
}

function readUsage(response: GenerateContentResponse): AiUsage | undefined {
  const usage = response.usageMetadata;
  if (!usage) return undefined;

  return {
    inputTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
    cacheReadTokens: usage.cachedContentTokenCount ?? 0,
    // Gemini bills cache creation through the explicit caches API, which this adapter does
    // not use, so there is never a cache write to report.
    cacheWriteTokens: 0,
  };
}

/**
 * Normalize an SDK failure into an `AppError`.
 *
 * The message on the returned error is user-facing and therefore vague, so the real cause
 * is logged here and attached as `cause`. Without that, a wrong model name and a revoked
 * key look identical in the logs, which is useless when something breaks in production.
 * The API key is never logged.
 */
function toAppError(error: unknown, slot: AiSlot): AppError {
  if (error instanceof AppError) return error;

  const status = error instanceof ApiError ? error.status : undefined;
  const detail = error instanceof Error ? error.message : String(error);

  console.error("[ai] gemini request failed", {
    model: slot.model,
    status: status ?? "none",
    detail,
  });

  const message = (() => {
    switch (status) {
      case STATUS_CODE.TOO_MANY_REQUESTS:
        return AI_MESSAGES.RATE_LIMITED;
      // Gemini answers a bad or revoked key with 400 as often as 401, so a rejected
      // request is treated as a credential problem and the router moves to the next key.
      case STATUS_CODE.BAD_REQUEST:
      case STATUS_CODE.UNAUTHORIZED:
      case STATUS_CODE.FORBIDDEN:
        return AI_MESSAGES.PROVIDER_AUTH_FAILED;
      case STATUS_CODE.NOT_FOUND:
        // Almost always a model name this key cannot reach.
        return AI_MESSAGES.MODEL_NOT_AVAILABLE;
      // A popular Gemini model answers 503 UNAVAILABLE under load. That is transient, so
      // it has to stay distinguishable from a dead key or the router cannot know to retry.
      case STATUS_CODE.BAD_GATEWAY:
      case STATUS_CODE.SERVICE_UNAVAILABLE:
      case STATUS_CODE.GATEWAY_TIMEOUT:
        return AI_MESSAGES.PROVIDER_OVERLOADED;
      default:
        return AI_MESSAGES.PROVIDER_FAILED;
    }
  })();

  return new AppError({ message, cause: error });
}

const geminiProvider: AiProvider = {
  name: GEMINI_PROVIDER_NAME,
  defaultModel: GEMINI_DEFAULT_MODEL,

  async chat(params, slot): Promise<AiChatResult> {
    try {
      const client = new GoogleGenAI({ apiKey: slot.apiKey });
      const response = await client.models.generateContent(buildRequest(params, slot));
      const usage = readUsage(response);

      return {
        text: response.text ?? "",
        provider: slot.provider,
        model: slot.model,
        ...(usage ? { usage } : {}),
      };
    } catch (error) {
      throw toAppError(error, slot);
    }
  },

  async *chatStream(params, slot): AsyncIterable<string> {
    try {
      const client = new GoogleGenAI({ apiKey: slot.apiKey });
      const stream = await client.models.generateContentStream(buildRequest(params, slot));

      for await (const chunk of stream) {
        if (chunk.text) yield chunk.text;
      }
    } catch (error) {
      throw toAppError(error, slot);
    }
  },
};

export default geminiProvider;
