import { AppError } from "@/server/core/errors";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import {
  chatMock,
  loadRouter,
  okResult,
  params,
  TWO_PROVIDERS,
} from "./harness";

describe("configuration", () => {
  it("builds one pool per configured provider", () => {
    const configured = loadRouter(TWO_PROVIDERS).listAiProviders();

    expect(configured).toEqual([
      { provider: "anthropic", model: "claude", keyCount: 1 },
      { provider: "gemini", model: "gemini-pro", keyCount: 1 },
    ]);
  });

  it("falls back to the provider default model when the model env is missing", () => {
    const configured = loadRouter({
      AI_PROVIDERS: "anthropic",
      ANTHROPIC_API_KEYS: "sk-a",
    }).listAiProviders();

    expect(configured).toEqual([
      { provider: "anthropic", model: "claude-opus-5", keyCount: 1 },
    ]);
  });

  it("treats empty env as AI not configured", () => {
    const loaded = loadRouter({});

    expect(loaded.isAiConfigured()).toBe(false);
    expect(loaded.listAiProviders()).toEqual([]);
  });

  it("skips a provider with no keys rather than breaking the whole list", () => {
    const configured = loadRouter({
      AI_PROVIDERS: "gemini,anthropic",
      ANTHROPIC_API_KEYS: "sk-a",
      ANTHROPIC_MODEL: "m1",
    }).listAiProviders();

    expect(configured).toEqual([{ provider: "anthropic", model: "m1", keyCount: 1 }]);
  });

  it("skips a provider name that has no adapter registered", () => {
    const configured = loadRouter({
      AI_PROVIDERS: "openai,anthropic",
      ANTHROPIC_API_KEYS: "sk-a",
      ANTHROPIC_MODEL: "m1",
    }).listAiProviders();

    expect(configured).toEqual([{ provider: "anthropic", model: "m1", keyCount: 1 }]);
  });
});

describe("providers are a fallback chain, not a rotation", () => {
  it("keeps sending every call to the first provider while it works", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.provider));

    const used = [
      (await loaded.chat(params)).model,
      (await loaded.chat(params)).model,
      (await loaded.chat(params)).model,
    ];

    expect(used).toEqual(["anthropic", "anthropic", "anthropic"]);
  });

  it("reaches a later provider only after the ones before it fail", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockImplementation(async (_params, slot) => {
      if (slot.provider === "anthropic") throw new AppError({ message: AI_MESSAGES.RATE_LIMITED });
      return okResult(slot.provider);
    });

    expect((await loaded.chat(params)).model).toBe("gemini");
  });

  it("keeps the model fixed per provider instead of rotating it", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.model));

    expect((await loaded.chat(params)).model).toBe("claude");
    expect((await loaded.chat(params)).model).toBe("claude");
  });
});
