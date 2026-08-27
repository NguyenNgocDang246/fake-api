import { AppError } from "@/server/core/errors";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import type { AiChatParams, AiSlot } from "@/server/services/ai/ai.types";
import {
  chatMock,
  chatStreamMock,
  loadRouter,
  okResult,
  params,
  ONE_PROVIDER_TWO_KEYS,
  TWO_PROVIDERS,
} from "./harness";

describe("a route narrows which providers a call may use", () => {
  it("sends the call to the named provider instead of the first configured one", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.provider));

    expect((await loaded.chat(params, { providers: ["gemini"] })).model).toBe("gemini");
  });

  it("pins hard: a single named provider gets no fallback to the others", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockImplementation(async (_params, slot) => {
      if (slot.provider === "anthropic") throw new AppError({ message: AI_MESSAGES.RATE_LIMITED });
      return okResult(slot.provider);
    });

    await expect(loaded.chat(params, { providers: ["anthropic"] })).rejects.toMatchObject({
      message: AI_MESSAGES.RATE_LIMITED,
    });
    expect((await loaded.chat(params)).model).toBe("gemini");
  });

  it("keeps a fallback chain inside a multi-provider route", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockImplementation(async (_params, slot) => {
      if (slot.provider === "gemini") throw new AppError({ message: AI_MESSAGES.RATE_LIMITED });
      return okResult(slot.provider);
    });

    const result = await loaded.chat(params, { providers: ["gemini", "anthropic"] });
    expect(result.model).toBe("anthropic");
  });

  it("lets the caller's order win over the env order", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.provider));

    expect((await loaded.chat(params, { providers: ["gemini", "anthropic"] })).model).toBe(
      "gemini"
    );
  });

  it("treats an empty provider list as no route at all", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.provider));

    expect((await loaded.chat(params, { providers: [] })).model).toBe("anthropic");
  });

  it("still walks the keys of the provider it was pinned to", async () => {
    const loaded = loadRouter({ ...ONE_PROVIDER_TWO_KEYS, AI_PROVIDERS: "anthropic,gemini" });
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.apiKey));

    const route = { providers: ["anthropic"] };
    const used = [
      (await loaded.chat(params, route)).model,
      (await loaded.chat(params, route)).model,
    ];

    expect(used).toEqual(["sk-a", "sk-b"]);
  });

  it("reports a missing provider as a configuration problem, not an outage", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);

    await expect(loaded.chat(params, { providers: ["openai"] })).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_NOT_AVAILABLE,
    });
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("still says NOT_CONFIGURED when the server has no providers at all", async () => {
    const loaded = loadRouter({});

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.NOT_CONFIGURED,
    });
  });

  it("answers isAiConfigured for one provider rather than for any", () => {
    const loaded = loadRouter(TWO_PROVIDERS);

    expect(loaded.isAiConfigured()).toBe(true);
    expect(loaded.isAiConfigured({ providers: ["gemini"] })).toBe(true);
    expect(loaded.isAiConfigured({ providers: ["openai"] })).toBe(false);
  });

  it("routes a stream the same way it routes a call", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatStreamMock.mockImplementation(async function* (_params: AiChatParams, slot: AiSlot) {
      yield slot.provider;
    });

    const chunks: string[] = [];
    for await (const chunk of loaded.chatStream(params, { providers: ["gemini"] })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["gemini"]);
  });
});
