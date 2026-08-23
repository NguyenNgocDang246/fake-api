import { AppError } from "@/server/core/errors";
import { AI_MESSAGES, AI_RATE_LIMIT_CALLS, STATUS_CODE } from "@/server/core/constants";
import type { AiChatParams, AiChatResult, AiProvider, AiSlot } from "@/server/services/ai/ai.types";

const chatMock = jest.fn<Promise<AiChatResult>, [AiChatParams, AiSlot]>();
const chatStreamMock = jest.fn();

const fakeProvider = (name: string, defaultModel: string): AiProvider => ({
  name,
  defaultModel,
  chat: (params, slot) => chatMock(params, slot),
  chatStream: (params, slot) => chatStreamMock(params, slot),
});

const providers: Record<string, AiProvider> = {
  anthropic: fakeProvider("anthropic", "claude-opus-5"),
  gemini: fakeProvider("gemini", "gemini-default"),
};

jest.mock("@/server/services/ai/providers", () => ({
  AI_PROVIDERS: providers,
  getProvider: (name: string) => providers[name],
}));

import * as router from "@/server/services/ai/ai_router.service";

const ENV_NAMES = [
  "AI_PROVIDERS",
  "ANTHROPIC_API_KEYS",
  "ANTHROPIC_MODEL",
  "GEMINI_API_KEYS",
  "GEMINI_MODEL",
  "AI_RATE_LIMIT_CALLS",
  "AI_RATE_LIMIT_WINDOW_SECONDS",
];

// A shared module instance rather than jest.isolateModules: a separate registry would
// rebuild the AppError class too, so `instanceof AppError` inside the router would stop
// matching the AppError this test imports. resetAiRouter is enough to reload env.
function loadRouter(env: Record<string, string | undefined>): typeof router {
  for (const name of ENV_NAMES) delete process.env[name];
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) process.env[key] = value;
  }

  router.resetAiRouter();
  return router;
}

const okResult = (model: string): AiChatResult => ({
  text: "{}",
  provider: "anthropic",
  model,
});

const params: AiChatParams = { messages: [{ role: "user", content: "hi" }], maxTokens: 100 };

const ONE_PROVIDER_TWO_KEYS = {
  AI_PROVIDERS: "anthropic",
  ANTHROPIC_API_KEYS: "sk-a,sk-b",
  ANTHROPIC_MODEL: "m1",
};

const TWO_PROVIDERS = {
  AI_PROVIDERS: "anthropic,gemini",
  ANTHROPIC_API_KEYS: "sk-a",
  ANTHROPIC_MODEL: "claude",
  GEMINI_API_KEYS: "gm-a",
  GEMINI_MODEL: "gemini-pro",
};

afterEach(() => {
  for (const name of ENV_NAMES) delete process.env[name];
});

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

describe("the rate limit caps the whole process, not one caller", () => {
  const LIMITED = { ...TWO_PROVIDERS, AI_RATE_LIMIT_CALLS: "2", AI_RATE_LIMIT_WINDOW_SECONDS: "60" };

  it("refuses the call past the window without reaching any provider", async () => {
    const loaded = loadRouter(LIMITED);
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.provider));

    await loaded.chat(params);
    await loaded.chat(params);
    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.TOO_MANY_REQUESTS,
      statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
    });

    expect(chatMock).toHaveBeenCalledTimes(2);
  });

  it("counts one logical call, not one per failover attempt", async () => {
    const loaded = loadRouter(LIMITED);
    chatMock.mockImplementation(async (_params, slot) => {
      if (slot.provider === "anthropic") throw new AppError({ message: AI_MESSAGES.RATE_LIMITED });
      return okResult(slot.provider);
    });

    await loaded.chat(params);
    await loaded.chat(params);

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.TOO_MANY_REQUESTS,
    });
  });

  it("counts a stream the same as a call", async () => {
    const loaded = loadRouter({ ...LIMITED, AI_RATE_LIMIT_CALLS: "1" });
    chatStreamMock.mockImplementation(async function* () {
      yield "ok";
    });

    for await (const chunk of loaded.chatStream(params)) void chunk;

    await expect(async () => {
      for await (const chunk of loaded.chatStream(params)) void chunk;
    }).rejects.toMatchObject({ message: AI_MESSAGES.TOO_MANY_REQUESTS });
  });

  it("does not care which caller is asking", async () => {
    const loaded = loadRouter({ ...LIMITED, AI_RATE_LIMIT_CALLS: "1" });
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.provider));

    await loaded.chat(params, { providers: ["anthropic"] });
    await expect(loaded.chat(params, { providers: ["gemini"] })).rejects.toMatchObject({
      message: AI_MESSAGES.TOO_MANY_REQUESTS,
    });
  });

  it("lets the window slide, so an old call stops counting", async () => {
    jest.useFakeTimers();
    try {
      const loaded = loadRouter({ ...LIMITED, AI_RATE_LIMIT_CALLS: "1", AI_RATE_LIMIT_WINDOW_SECONDS: "1" });
      chatMock.mockImplementation(async (_params, slot) => okResult(slot.provider));

      await loaded.chat(params);
      jest.advanceTimersByTime(1_500);

      await expect(loaded.chat(params)).resolves.toMatchObject({ model: "anthropic" });
    } finally {
      jest.useRealTimers();
    }
  });

  it("treats zero as off rather than as a limit of none", async () => {
    const loaded = loadRouter({ ...TWO_PROVIDERS, AI_RATE_LIMIT_CALLS: "0" });
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.provider));

    for (let call = 0; call < 25; call += 1) await loaded.chat(params);

    expect(chatMock).toHaveBeenCalledTimes(25);
  });

  it("falls back to the default rather than uncapping when the env is nonsense", async () => {
    const loaded = loadRouter({ ...TWO_PROVIDERS, AI_RATE_LIMIT_CALLS: "ten" });
    chatMock.mockImplementation(async (_params, slot) => okResult(slot.provider));

    for (let call = 0; call < AI_RATE_LIMIT_CALLS; call += 1) await loaded.chat(params);

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.TOO_MANY_REQUESTS,
    });
  });
});

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

describe("failover", () => {
  it("falls through to the next provider when the first one throws", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock
      .mockRejectedValueOnce(new AppError({ message: AI_MESSAGES.RATE_LIMITED }))
      .mockImplementationOnce(async (_params, slot) => okResult(slot.provider));

    expect((await loaded.chat(params)).model).toBe("gemini");
    expect(chatMock).toHaveBeenCalledTimes(2);
  });

  it("falls through to the provider's other key when only one provider is configured", async () => {
    const loaded = loadRouter(ONE_PROVIDER_TWO_KEYS);
    chatMock
      .mockRejectedValueOnce(new AppError({ message: AI_MESSAGES.RATE_LIMITED }))
      .mockImplementationOnce(async (_params, slot) => okResult(slot.apiKey));

    expect((await loaded.chat(params)).model).toBe("sk-b");
  });

  it("does not retry a lone provider whose single key was rejected", async () => {
    const loaded = loadRouter({ AI_PROVIDERS: "anthropic", ANTHROPIC_API_KEYS: "sk-a" });
    chatMock.mockRejectedValue(new AppError({ message: AI_MESSAGES.PROVIDER_AUTH_FAILED }));

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_AUTH_FAILED,
    });
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a model the credentials cannot reach", async () => {
    const loaded = loadRouter({ AI_PROVIDERS: "anthropic", ANTHROPIC_API_KEYS: "sk-a" });
    chatMock.mockRejectedValue(new AppError({ message: AI_MESSAGES.MODEL_NOT_AVAILABLE }));

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.MODEL_NOT_AVAILABLE,
    });
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it("stops at the first slot when the vendor called the request malformed", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockRejectedValue(
      new AppError({ message: AI_MESSAGES.PROVIDER_REJECTED_REQUEST })
    );

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_REJECTED_REQUEST,
    });
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it("stops at the first key too, not just the first provider", async () => {
    const loaded = loadRouter(ONE_PROVIDER_TWO_KEYS);
    chatMock.mockRejectedValue(
      new AppError({ message: AI_MESSAGES.PROVIDER_REJECTED_REQUEST })
    );

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_REJECTED_REQUEST,
    });
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it("still fails over on a generic failure, which another provider may survive", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock
      .mockRejectedValueOnce(new AppError({ message: AI_MESSAGES.PROVIDER_FAILED }))
      .mockImplementationOnce(async (_params, slot) => okResult(slot.provider));

    expect((await loaded.chat(params)).model).toBe("gemini");
    expect(chatMock).toHaveBeenCalledTimes(2);
  });
});

describe("retrying a transient failure", () => {
  it("retries a lone provider that is temporarily overloaded", async () => {
    const loaded = loadRouter({ AI_PROVIDERS: "anthropic", ANTHROPIC_API_KEYS: "sk-a" });
    chatMock
      .mockRejectedValueOnce(new AppError({ message: AI_MESSAGES.PROVIDER_OVERLOADED }))
      .mockImplementationOnce(async (_params, slot) => okResult(slot.provider));

    expect((await loaded.chat(params)).model).toBe("anthropic");
    expect(chatMock).toHaveBeenCalledTimes(2);
  });

  it("does not repeat a rate limited slot, since the quota needs seconds not milliseconds", async () => {
    const loaded = loadRouter({ AI_PROVIDERS: "anthropic", ANTHROPIC_API_KEYS: "sk-a" });
    chatMock.mockRejectedValue(new AppError({ message: AI_MESSAGES.RATE_LIMITED }));

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.RATE_LIMITED,
    });
    expect(chatMock).toHaveBeenCalledTimes(1);
  });

  it("still moves a rate limited call to another provider", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockImplementation(async (_params, slot) => {
      if (slot.provider === "anthropic") {
        throw new AppError({ message: AI_MESSAGES.RATE_LIMITED });
      }
      return okResult(slot.provider);
    });

    expect((await loaded.chat(params)).model).toBe("gemini");
  });

  it("stops after MAX_ATTEMPTS even when every attempt is retryable", async () => {
    const loaded = loadRouter({ AI_PROVIDERS: "anthropic", ANTHROPIC_API_KEYS: "sk-a" });
    chatMock.mockRejectedValue(new AppError({ message: AI_MESSAGES.PROVIDER_OVERLOADED }));

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_OVERLOADED,
    });
    expect(chatMock).toHaveBeenCalledTimes(3);
  });

  it("prefers an untried provider over repeating the overloaded one", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock.mockImplementation(async (_params, slot) => {
      if (slot.provider === "anthropic") {
        throw new AppError({ message: AI_MESSAGES.PROVIDER_OVERLOADED });
      }
      return okResult(slot.provider);
    });

    expect((await loaded.chat(params)).model).toBe("gemini");
    expect(chatMock).toHaveBeenCalledTimes(2);
  });

  it("throws the last error when every attempt fails", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatMock
      .mockRejectedValueOnce(new AppError({ message: AI_MESSAGES.RATE_LIMITED }))
      .mockRejectedValueOnce(new AppError({ message: AI_MESSAGES.PROVIDER_AUTH_FAILED }));

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.PROVIDER_AUTH_FAILED,
    });
  });

  it("reports NOT_CONFIGURED without touching any provider", async () => {
    const loaded = loadRouter({});

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.NOT_CONFIGURED,
    });
    expect(chatMock).not.toHaveBeenCalled();
  });

  it("does not spend the rate limit window on a call that is not configured", async () => {
    const loaded = loadRouter({ AI_RATE_LIMIT_CALLS: "1", AI_RATE_LIMIT_WINDOW_SECONDS: "60" });

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.NOT_CONFIGURED,
    });

    const configured = loadRouter({
      ...ONE_PROVIDER_TWO_KEYS,
      AI_RATE_LIMIT_CALLS: "1",
      AI_RATE_LIMIT_WINDOW_SECONDS: "60",
    });
    chatMock.mockImplementationOnce(async (_params, slot) => okResult(slot.provider));

    await expect(configured.chat(params)).resolves.toMatchObject({ model: "anthropic" });
  });
});

describe("chatStream", () => {
  it("yields the provider's chunks in order", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatStreamMock.mockImplementation(async function* () {
      yield "a";
      yield "b";
    });

    const chunks: string[] = [];
    for await (const chunk of loaded.chatStream(params)) chunks.push(chunk);

    expect(chunks).toEqual(["a", "b"]);
  });

  it("switches provider when the failure happens before any text is emitted", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatStreamMock
      .mockImplementationOnce(async function* () {
        throw new AppError({ message: AI_MESSAGES.RATE_LIMITED });
         
        yield "";
      })
      .mockImplementationOnce(async function* () {
        yield "ok";
      });

    const chunks: string[] = [];
    for await (const chunk of loaded.chatStream(params)) chunks.push(chunk);

    expect(chunks).toEqual(["ok"]);
  });

  it("propagates a mid-stream failure instead of replaying the opening text", async () => {
    const loaded = loadRouter(TWO_PROVIDERS);
    chatStreamMock.mockImplementationOnce(async function* () {
      yield "already sent";
      throw new AppError({ message: AI_MESSAGES.PROVIDER_FAILED });
    });

    const chunks: string[] = [];
    await expect(
      (async () => {
        for await (const chunk of loaded.chatStream(params)) chunks.push(chunk);
      })()
    ).rejects.toMatchObject({ message: AI_MESSAGES.PROVIDER_FAILED });

    expect(chunks).toEqual(["already sent"]);
    expect(chatStreamMock).toHaveBeenCalledTimes(1);
  });

  it("reports a configuration problem at the call, not at the first iteration", () => {
    const loaded = loadRouter({});

    expect(() => loaded.chatStream(params)).toThrow(AI_MESSAGES.NOT_CONFIGURED);
  });

  it("consumes the rate limit window even if the caller never iterates", async () => {
    const loaded = loadRouter({
      ...TWO_PROVIDERS,
      AI_RATE_LIMIT_CALLS: "1",
      AI_RATE_LIMIT_WINDOW_SECONDS: "60",
    });

    loaded.chatStream(params);

    await expect(loaded.chat(params)).rejects.toMatchObject({
      message: AI_MESSAGES.TOO_MANY_REQUESTS,
      statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
    });
    expect(chatMock).not.toHaveBeenCalled();
  });

  describe("a provider that cannot stream", () => {
    const textOnly: AiProvider = {
      name: "anthropic",
      defaultModel: "claude-opus-5",
      chat: (params, slot) => chatMock(params, slot),
    };

    let restore: AiProvider | undefined;

    beforeEach(() => {
      restore = providers["anthropic"];
      providers["anthropic"] = textOnly;
    });

    afterEach(() => {
      if (restore) providers["anthropic"] = restore;
    });

    it("is dropped from the chain rather than spending an attempt", async () => {
      const loaded = loadRouter(TWO_PROVIDERS);
      chatStreamMock.mockImplementation(async function* () {
        yield "from gemini";
      });

      const chunks: string[] = [];
      for await (const chunk of loaded.chatStream(params)) chunks.push(chunk);

      expect(chunks).toEqual(["from gemini"]);
      expect(chatStreamMock).toHaveBeenCalledTimes(1);
      expect(chatStreamMock.mock.calls[0]?.[1]).toMatchObject({ provider: "gemini" });
    });

    it("reports a server that cannot stream at all as a provider problem, not a vendor failure", () => {
      const loaded = loadRouter({ AI_PROVIDERS: "anthropic", ANTHROPIC_API_KEYS: "a1" });

      expect(() => loaded.chatStream(params)).toThrow(AI_MESSAGES.PROVIDER_NOT_AVAILABLE);
      expect(chatStreamMock).not.toHaveBeenCalled();
    });

    it("still answers NOT_CONFIGURED when there is no AI at all", () => {
      const loaded = loadRouter({});

      expect(() => loaded.chatStream(params)).toThrow(AI_MESSAGES.NOT_CONFIGURED);
    });
  });
});
