import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { GenerateContentParameters, GenerateContentResponse } from "@google/genai";
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

export const GEMINI_PROVIDER_NAME = "gemini";
export const GEMINI_DEFAULT_MODEL = "gemini-3.7-flash";

const THINKING_LEVELS: Record<NonNullable<AiChatParams["effort"]>, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

function buildRequest(params: AiChatParams, slot: AiSlot): GenerateContentParameters {
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
      // The SDK sets no deadline of its own, so without this a hung request never returns.
      httpOptions: { timeout: AI_REQUEST_TIMEOUT_MS },
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
    outputTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
    cacheReadTokens: usage.cachedContentTokenCount ?? 0,
    cacheWriteTokens: 0,
  };
}

function readStopReason(response: GenerateContentResponse): AiStopReason | undefined {
  const reason = response.candidates?.[0]?.finishReason;
  if (!reason) return undefined;
  if (reason === FinishReason.MAX_TOKENS) return "max_tokens";
  return reason === FinishReason.STOP ? "stop" : "other";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

// Gemini answers a bad key with 400 as often as 401, so a 400 has to be split on the message.
const CREDENTIAL_HINTS = ["api key not valid", "api_key_invalid", "invalid authentication"];

function isCredentialFailure(detail: string): boolean {
  const haystack = detail.toLowerCase();
  return CREDENTIAL_HINTS.some((hint) => haystack.includes(hint));
}

function toAppError(error: unknown, slot: AiSlot): AppError {
  if (error instanceof AppError) return error;

  const status = error instanceof ApiError ? error.status : undefined;
  const detail = error instanceof Error ? error.message : String(error);

  console.error("[ai] gemini request failed", {
    model: slot.model,
    status: status ?? "none",
    detail,
  });

  if (isAbortError(error)) {
    return toAiError(AI_MESSAGES.PROVIDER_TIMEOUT, error);
  }

  const message = (() => {
    switch (status) {
      case STATUS_CODE.TOO_MANY_REQUESTS:
        return AI_MESSAGES.RATE_LIMITED;
      case STATUS_CODE.BAD_REQUEST:
        return isCredentialFailure(detail)
          ? AI_MESSAGES.PROVIDER_AUTH_FAILED
          : AI_MESSAGES.PROVIDER_REJECTED_REQUEST;
      case STATUS_CODE.UNAUTHORIZED:
      case STATUS_CODE.FORBIDDEN:
        return AI_MESSAGES.PROVIDER_AUTH_FAILED;
      case STATUS_CODE.NOT_FOUND:
        return AI_MESSAGES.MODEL_NOT_AVAILABLE;
      default:
        return typeof status === "number" && status >= STATUS_CODE.SERVER_ERROR
          ? AI_MESSAGES.PROVIDER_OVERLOADED
          : AI_MESSAGES.PROVIDER_FAILED;
    }
  })();

  return toAiError(message, error);
}

const geminiProvider: AiProvider = {
  name: GEMINI_PROVIDER_NAME,
  defaultModel: GEMINI_DEFAULT_MODEL,

  async chat(params, slot): Promise<AiChatResult> {
    try {
      const client = new GoogleGenAI({ apiKey: slot.apiKey });
      const response = await client.models.generateContent(buildRequest(params, slot));
      const usage = readUsage(response);
      const stopReason = readStopReason(response);

      return {
        text: response.text ?? "",
        provider: slot.provider,
        ...(stopReason ? { stopReason } : {}),
        model: response.modelVersion ?? slot.model,
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
