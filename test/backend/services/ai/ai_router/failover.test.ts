import { AppError } from "@/server/core/errors";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import {
  chatMock,
  loadRouter,
  okResult,
  params,
  ONE_PROVIDER_TWO_KEYS,
  TWO_PROVIDERS,
} from "./harness";

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
