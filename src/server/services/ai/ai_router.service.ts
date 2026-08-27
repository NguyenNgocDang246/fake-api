import { AI_TOTAL_BUDGET_MS } from "@/server/services/ai/ai.constants";
import { AiChatParams, AiChatResult, AiRoute } from "@/server/services/ai/ai.types";
import { getProvider } from "@/server/services/ai/providers";
import { consumeAiRateLimit } from "@/server/services/ai/ai_rate_limit";
import { ProviderPool, isAiConfigured, listAiProviders, resetAiRouter, toSlot } from "@/server/services/ai/ai_pool";
import {
  backoff,
  finalError,
  getProviderOrThrow,
  shouldContinue,
  takeAttempts,
} from "@/server/services/ai/ai_attempts";

export { isAiConfigured, listAiProviders, resetAiRouter };

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
