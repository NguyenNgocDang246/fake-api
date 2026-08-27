import {
  generateContentMock,
  GoogleGenAI,
  geminiProvider,
  slot,
  params,
  request,
} from "./harness";

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

  it("reports a truncated answer as max_tokens", async () => {
    generateContentMock.mockResolvedValue({
      text: '{"variants":[{"a"',
      candidates: [{ finishReason: "MAX_TOKENS" }],
    });

    await expect(geminiProvider.chat(params, slot)).resolves.toMatchObject({
      stopReason: "max_tokens",
    });
  });

  it("reports a complete answer as stop", async () => {
    generateContentMock.mockResolvedValue({
      text: "{}",
      candidates: [{ finishReason: "STOP" }],
    });

    await expect(geminiProvider.chat(params, slot)).resolves.toMatchObject({
      stopReason: "stop",
    });
  });

  it("collapses any other finish reason to other rather than guessing", async () => {
    generateContentMock.mockResolvedValue({
      text: "",
      candidates: [{ finishReason: "SAFETY" }],
    });

    await expect(geminiProvider.chat(params, slot)).resolves.toMatchObject({
      stopReason: "other",
    });
  });

  it("omits stopReason when the provider did not report one", async () => {
    generateContentMock.mockResolvedValue({ text: "{}" });

    const result = await geminiProvider.chat(params, slot);

    expect(result).not.toHaveProperty("stopReason");
  });
});
