import { AppError } from "@/server/core/errors";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import {
  chatMock,
  loadRouter,
  okResult,
  params,
  ONE_PROVIDER_TWO_KEYS,
} from "./harness";

describe("key rotation inside a provider", () => {
  it("walks the provider's keys in turn", async () => {
    const loaded = loadRouter(ONE_PROVIDER_TWO_KEYS);
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.apiKey));

    const used = [
      (await loaded.chat(params)).model,
      (await loaded.chat(params)).model,
      (await loaded.chat(params)).model,
    ];

    expect(used).toEqual(["sk-a", "sk-b", "sk-a"]);
  });

  it("gives each provider its own key cursor", async () => {
    const loaded = loadRouter({
      AI_PROVIDERS: "anthropic,gemini",
      ANTHROPIC_API_KEYS: "sk-a,sk-b",
      GEMINI_API_KEYS: "gm-a,gm-b",
    });
    chatMock.mockImplementation(async (_params, slot) => {
      if (slot.provider === "anthropic") {
        throw new AppError({ message: `dead ${slot.apiKey}` });
      }
      return okResult(slot.apiKey);
    });

    expect((await loaded.chat(params)).model).toBe("gm-a");
    expect((await loaded.chat(params)).model).toBe("gm-b");

    const anthropicKeys = chatMock.mock.calls
      .map(([, slot]) => slot)
      .filter((slot) => slot.provider === "anthropic")
      .map((slot) => slot.apiKey);
    expect(anthropicKeys).toEqual(["sk-a", "sk-b"]);
  });

  it("does not advance a provider's cursor on a call it never handled", async () => {
    const loaded = loadRouter({
      AI_PROVIDERS: "anthropic,gemini",
      ANTHROPIC_API_KEYS: "sk-a,sk-b",
      GEMINI_API_KEYS: "gm-a,gm-b",
    });
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.apiKey));

    await loaded.chat(params);
    await loaded.chat(params);

    expect(chatMock.mock.calls.every(([, slot]) => slot.provider === "anthropic")).toBe(true);
  });
});

describe("the attempt chain covers keys, not providers", () => {
  const slotsTried = () =>
    chatMock.mock.calls.map(([, slot]) => `${slot.provider}/${slot.apiKey}`);

  it("reaches the second key of a provider even when an earlier one has only one", async () => {
    const loaded = loadRouter({
      AI_PROVIDERS: "gemini,anthropic",
      GEMINI_API_KEYS: "gm-a",
      ANTHROPIC_API_KEYS: "sk-a,sk-b",
    });
    chatMock.mockRejectedValue(new AppError({ message: AI_MESSAGES.PROVIDER_FAILED }));

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_FAILED,
    });

    expect(slotsTried()).toEqual(["gemini/gm-a", "anthropic/sk-a", "anthropic/sk-b"]);
  });

  it("still offers every provider its first key before any provider gets a second", async () => {
    const loaded = loadRouter({
      AI_PROVIDERS: "anthropic,gemini",
      ANTHROPIC_API_KEYS: "sk-a,sk-b",
      GEMINI_API_KEYS: "gm-a,gm-b",
    });
    chatMock.mockRejectedValue(new AppError({ message: AI_MESSAGES.PROVIDER_FAILED }));

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_FAILED,
    });

    expect(slotsTried()).toEqual(["anthropic/sk-a", "gemini/gm-a", "anthropic/sk-b"]);
  });

  it("stops once the keys really are exhausted, rather than counting more than it has", async () => {
    const loaded = loadRouter(ONE_PROVIDER_TWO_KEYS);
    chatMock.mockRejectedValue(new AppError({ message: AI_MESSAGES.PROVIDER_FAILED }));

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_FAILED,
    });

    expect(slotsTried()).toEqual(["anthropic/sk-a", "anthropic/sk-b"]);
  });
});
