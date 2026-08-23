import { AppError } from "@/server/core/errors";
import { STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES, AI_TOTAL_BUDGET_MS } from "@/server/services/ai/ai.constants";
import {
  AiChatParams,
  AiChatResult,
  AiProvider,
  AiRoute,
  AiSlot,
} from "@/server/services/ai/ai.types";
import { getProvider } from "@/server/services/ai/providers";
import { consumeAiRateLimit, resetAiRateLimit } from "@/server/services/ai/ai_rate_limit";

const MAX_ATTEMPTS = 3;

const RETRY_BASE_DELAY_MS = 400;

// Env var names follow from the provider name, so registering an adapter is the only step
// needed to add a provider: `gemini` reads GEMINI_API_KEYS and GEMINI_MODEL.
function envNames(provider: string) {
  const prefix = provider.toUpperCase();
  return { keys: `${prefix}_API_KEYS`, model: `${prefix}_MODEL` };
}

interface ProviderPool {
  provider: string;
  model: string;
  apiKeys: string[];
  nextKey: number;
}

function splitEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildPools(): ProviderPool[] {
  return splitEnv("AI_PROVIDERS").flatMap((name) => {
    const provider = getProvider(name);
    if (!provider) return [];

    const env = envNames(name);
    const apiKeys = splitEnv(env.keys);
    if (apiKeys.length === 0) return [];

    return [
      {
        provider: name,
        model: (process.env[env.model] ?? "").trim() || provider.defaultModel,
        apiKeys,
        nextKey: 0,
      },
    ];
  });
}

let cachedPools: ProviderPool[] | null = null;

function getPools(): ProviderPool[] {
  cachedPools ??= buildPools();
  return cachedPools;
}

export function resetAiRouter(): void {
  cachedPools = null;
  resetAiRateLimit();
}

function selectPools(route?: AiRoute): ProviderPool[] {
  const pools = getPools();
  const wanted = route?.providers;
  if (!wanted?.length) return pools;

  return wanted.flatMap((name) => pools.filter((pool) => pool.provider === name));
}

export function isAiConfigured(route?: AiRoute): boolean {
  return selectPools(route).length > 0;
}

export function listAiProviders(): { provider: string; model: string; keyCount: number }[] {
  return getPools().map((pool) => ({
    provider: pool.provider,
    model: pool.model,
    keyCount: pool.apiKeys.length,
  }));
}

function takeKey(pool: ProviderPool): string {
  const apiKey = pool.apiKeys[pool.nextKey % pool.apiKeys.length]!;
  pool.nextKey = (pool.nextKey + 1) % pool.apiKeys.length;
  return apiKey;
}

const RETRYABLE: ReadonlySet<string> = new Set([AI_MESSAGES.PROVIDER_OVERLOADED]);

function isRetryable(error: unknown): boolean {
  return error instanceof AppError && RETRYABLE.has(error.message);
}

const NO_FAILOVER: ReadonlySet<string> = new Set([AI_MESSAGES.PROVIDER_REJECTED_REQUEST]);

function isFatal(error: unknown): boolean {
  return error instanceof AppError && NO_FAILOVER.has(error.message);
}

function takeAttempts(
  route?: AiRoute,
  accepts?: (pool: ProviderPool) => boolean
): { pools: ProviderPool[]; distinctSlots: number } {
  const selected = selectPools(route);
  const pools = accepts ? selected.filter(accepts) : selected;
  if (pools.length === 0) {
    throw new AppError({
      message:
        route?.providers?.length || selected.length > 0
          ? AI_MESSAGES.PROVIDER_NOT_AVAILABLE
          : AI_MESSAGES.NOT_CONFIGURED,
      statusCode: STATUS_CODE.SERVER_ERROR,
    });
  }

  // One entry per key, laid out in rounds: every pool offers its first key before any offers its
  // second. Keeps provider priority intact while making the chain and `distinctSlots` count the
  // same list, so `shouldContinue` knows when an untried slot really is left.
  const rounds = Math.max(...pools.map((pool) => pool.apiKeys.length));
  const slots = Array.from({ length: rounds }, (_, round) =>
    pools.filter((pool) => pool.apiKeys.length > round)
  ).flat();

  return {
    pools: Array.from({ length: MAX_ATTEMPTS }, (_, offset) => slots[offset % slots.length]!),
    distinctSlots: Math.min(slots.length, MAX_ATTEMPTS),
  };
}

function shouldContinue(error: unknown, attemptsMade: number, distinctSlots: number): boolean {
  if (isFatal(error)) return false;
  return attemptsMade < distinctSlots || isRetryable(error);
}

function backoff(attemptsMade: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * attemptsMade));
}

function toSlot(pool: ProviderPool): AiSlot {
  return { provider: pool.provider, model: pool.model, apiKey: takeKey(pool) };
}

function getProviderOrThrow(name: string): AiProvider {
  const provider = getProvider(name);
  if (!provider) {
    throw new AppError({
      message: AI_MESSAGES.PROVIDER_NOT_AVAILABLE,
      statusCode: STATUS_CODE.SERVER_ERROR,
    });
  }
  return provider;
}

function finalError(lastError: unknown): AppError {
  return lastError instanceof AppError
    ? lastError
    : new AppError({ message: AI_MESSAGES.PROVIDER_FAILED });
}

export async function chat(params: AiChatParams, route?: AiRoute): Promise<AiChatResult> {
  const { pools, distinctSlots } = takeAttempts(route);
  consumeAiRateLimit();

  const deadline = Date.now() + AI_TOTAL_BUDGET_MS;
  let lastError: unknown;

  for (const [index, pool] of pools.entries()) {
    const provider = getProviderOrThrow(pool.provider);

    try {
      return await provider.chat(params, toSlot(pool));
    } catch (error) {
      lastError = error;

      const attemptsMade = index + 1;
      if (!shouldContinue(error, attemptsMade, distinctSlots)) break;
      if (Date.now() >= deadline) break;
      // Only pause when about to repeat a slot; moving to a fresh provider needs no wait.
      if (attemptsMade >= distinctSlots) await backoff(attemptsMade);
    }
  }

  throw finalError(lastError);
}

// Deliberately not an async generator: a generator body does not run until the first `next()`,
// which would defer the configuration check and the rate limit below to iteration time.
export function chatStream(params: AiChatParams, route?: AiRoute): AsyncIterable<string> {
  const { pools, distinctSlots } = takeAttempts(
    route,
    (pool) => !!getProvider(pool.provider)?.chatStream
  );
  consumeAiRateLimit();

  return streamFrom(params, pools, distinctSlots);
}

async function* streamFrom(
  params: AiChatParams,
  pools: ProviderPool[],
  distinctSlots: number
): AsyncIterable<string> {
  const deadline = Date.now() + AI_TOTAL_BUDGET_MS;
  let lastError: unknown;

  for (const [index, pool] of pools.entries()) {
    const provider = getProviderOrThrow(pool.provider);

    let emitted = false;
    try {
      for await (const chunk of provider.chatStream!(params, toSlot(pool))) {
        emitted = true;
        yield chunk;
      }
      return;
    } catch (error) {
      if (emitted) throw error;
      lastError = error;

      const attemptsMade = index + 1;
      if (!shouldContinue(error, attemptsMade, distinctSlots)) break;
      if (Date.now() >= deadline) break;
      if (attemptsMade >= distinctSlots) await backoff(attemptsMade);
    }
  }

  throw finalError(lastError);
}

const aiRouter = { chat, chatStream, isAiConfigured, listAiProviders, resetAiRouter };
export default aiRouter;
