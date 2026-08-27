import { AppError } from "@/server/core/errors";
import { STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import type { AiProvider } from "@/server/services/ai/ai.types";
import {
  chatMock,
  chatStreamMock,
  providers,
  loadRouter,
  params,
  TWO_PROVIDERS,
} from "./harness";

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
