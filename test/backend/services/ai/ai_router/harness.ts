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

export {
  chatMock,
  providers,
  chatStreamMock,
  loadRouter,
  okResult,
  params,
  ONE_PROVIDER_TWO_KEYS,
  TWO_PROVIDERS,
};
