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
}));

import { GoogleGenAI } from "@google/genai";
import geminiProvider, { GEMINI_DEFAULT_MODEL } from "@/server/services/ai/providers/gemini.provider";
import { AI_MESSAGES } from "@/server/core/constants";
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

describe("request mapping", () => {
  beforeEach(() => generateContentMock.mockResolvedValue({ text: "{}" }));

  it("passes the slot's key and model through", async () => {
    await geminiProvider.chat(params, slot);

    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: "gm-key" });
    expect(request().model).toBe("gemini-test");
  });

  it("names the assistant turn 'model', which is what Gemini expects", async () => {
    await geminiProvider.chat(
      {
        ...params,
        messages: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "hello" },
          { role: "user", content: "again" },
        ],
      },
      slot
    );

    expect(request().contents).toEqual([
      { role: "user", parts: [{ text: "hi" }] },
      { role: "model", parts: [{ text: "hello" }] },
      { role: "user", parts: [{ text: "again" }] },
    ]);
  });

  it("joins system blocks into one systemInstruction", async () => {
    await geminiProvider.chat(
      { ...params, system: [{ text: "rules" }, { text: "context", cacheable: true }] },
      slot
    );

    expect(request().config.systemInstruction).toBe("rules\n\ncontext");
  });

  it("omits systemInstruction when there is no system prompt", async () => {
    const { system: _system, ...withoutSystem } = params;
    await geminiProvider.chat(withoutSystem, slot);

    expect(request().config).not.toHaveProperty("systemInstruction");
  });

  it("maps effort onto a thinking level, defaulting to low", async () => {
    await geminiProvider.chat(params, slot);
    expect(request().config.thinkingConfig).toEqual({ thinkingLevel: "LOW" });

    generateContentMock.mockClear();
    await geminiProvider.chat({ ...params, effort: "high" }, slot);
    expect(request().config.thinkingConfig).toEqual({ thinkingLevel: "HIGH" });
  });

  it("asks for JSON output only when a schema is supplied", async () => {
    await geminiProvider.chat(params, slot);
    expect(request().config).not.toHaveProperty("responseJsonSchema");

    generateContentMock.mockClear();
    const schema = { type: "object" };
    await geminiProvider.chat({ ...params, jsonSchema: schema }, slot);
    expect(request().config.responseMimeType).toBe("application/json");
    expect(request().config.responseJsonSchema).toBe(schema);
  });

  it("carries maxTokens across as maxOutputTokens", async () => {
    await geminiProvider.chat(params, slot);
    expect(request().config.maxOutputTokens).toBe(500);
  });
});

describe("response mapping", () => {
  it("returns the text and reports usage", async () => {
    generateContentMock.mockResolvedValue({
      text: '{"variants":[]}',
      usageMetadata: {
        promptTokenCount: 120,
        candidatesTokenCount: 30,
        cachedContentTokenCount: 100,
      },
    });

    await expect(geminiProvider.chat(params, slot)).resolves.toEqual({
      text: '{"variants":[]}',
      provider: "gemini",
      model: "gemini-test",
      usage: {
        inputTokens: 120,
        outputTokens: 30,
        cacheReadTokens: 100,
        cacheWriteTokens: 0,
      },
    });
  });

  it("treats a blocked or empty response as empty text, not a crash", async () => {
    generateContentMock.mockResolvedValue({ text: undefined });

    const result = await geminiProvider.chat(params, slot);

    expect(result.text).toBe("");
    expect(result).not.toHaveProperty("usage");
  });
});

describe("error mapping", () => {
  // The adapter logs the real cause on every failure, which is the point of these cases.
  // Silence it so a passing run stays readable.
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
    const original = new FakeApiError(500);
    generateContentMock.mockRejectedValue(original);

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_FAILED,
      cause: original,
    });
  });

  // A busy Gemini model answers 503 UNAVAILABLE. That has to stay distinguishable from a
  // dead key, because the router retries one and gives up on the other.
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

  it.each([400, 401, 403])("reports a %s as a credential problem", async (status) => {
    generateContentMock.mockRejectedValue(new FakeApiError(status));

    await expect(geminiProvider.chat(params, slot)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_AUTH_FAILED,
    });
  });

  it("reports anything else as a generic provider failure", async () => {
    generateContentMock.mockRejectedValue(new FakeApiError(500));

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
