import { AppError } from "@/server/core/errors";
import { STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES, AI_RATE_LIMIT_CALLS } from "@/server/services/ai/ai.constants";
import {
  chatMock,
  chatStreamMock,
  loadRouter,
  okResult,
  params,
  TWO_PROVIDERS,
} from "./harness";

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
