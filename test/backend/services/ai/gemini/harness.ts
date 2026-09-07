const generateContentMock = jest.fn();
const generateContentStreamMock = jest.fn();

class FakeApiError extends Error {
  status: number;
  constructor(status: number) {
    super(`api error ${status}`);
    this.status = status;
  }
}

jest.mock("@google/genai", () => ({
  __esModule: true,
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: generateContentMock, generateContentStream: generateContentStreamMock },
  })),
  ApiError: FakeApiError,
  ThinkingLevel: { LOW: "LOW", MEDIUM: "MEDIUM", HIGH: "HIGH" },
  FinishReason: { STOP: "STOP", MAX_TOKENS: "MAX_TOKENS", SAFETY: "SAFETY" },
}));

import { GoogleGenAI } from "@google/genai";
import geminiProvider, { GEMINI_DEFAULT_MODEL } from "@/server/services/ai/providers/gemini.provider";
import type { AiChatParams, AiSlot } from "@/server/services/ai/ai.types";

const slot: AiSlot = { provider: "gemini", model: "gemini-test", apiKey: "gm-key" };

const params: AiChatParams = {
  system: "be terse",
  messages: [{ role: "user", content: "hello" }],
  maxTokens: 500,
};

function request() {
  return generateContentMock.mock.calls[0][0];
}

export {
  generateContentMock,
  generateContentStreamMock,
  FakeApiError,
  GoogleGenAI,
  geminiProvider,
  GEMINI_DEFAULT_MODEL,
  slot,
  params,
  request,
};
