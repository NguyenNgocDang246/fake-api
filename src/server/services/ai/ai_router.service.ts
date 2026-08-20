import { AppError } from "@/server/core/errors";
import { AI_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { AiChatParams, AiChatResult, AiRoute, AiSlot } from "@/server/services/ai/ai.types";
import { getProvider } from "@/server/services/ai/providers";
import { consumeAiRateLimit, resetAiRateLimit } from "@/server/services/ai/ai_rate_limit";


/**
 * Router in front of the configured AI providers.
 *
 * Round-robin applies to API keys only. Each provider keeps its own key cursor, so every
 * call takes that provider's next key and load spreads across the keys it was given. The
 * model is fixed per provider, and providers themselves are not rotated.
 *
 * The order of `AI_PROVIDERS` is a priority order, not a rotation: the first provider is
 * always used, and a later one is reached only when the ones before it fail. That makes the
 * provider list a fallback chain rather than a load split.
 *
 * A caller that needs a particular vendor passes an `AiRoute` as the second argument, which
 * narrows the chain to the providers it names. Callers that do not care omit it and get the
 * env order. Nothing about a caller's requirements is encoded here: the domain says which
 * providers it accepts, this file only honours the list.
 *
 * Every call first passes `consumeAiRateLimit`, a single window for the whole process that caps
 * how fast this server will spend money regardless of who is asking. See `ai_rate_limit.ts`.
 *
 * Configuration comes from env:
 *   AI_PROVIDERS=anthropic,gemini
 *   ANTHROPIC_API_KEYS=sk-a,sk-b
 *   ANTHROPIC_MODEL=claude-opus-5
 *   AI_RATE_LIMIT_CALLS=10
 *   AI_RATE_LIMIT_WINDOW_SECONDS=1
 *
 * This is the only public entry point of the AI layer. It imports nothing from the domain.
 */

const MAX_ATTEMPTS = 3;

/** Grows with each repeat: 400ms, then 800ms. Short enough not to stall a preview request. */
const RETRY_BASE_DELAY_MS = 400;

/**
 * Env var names follow from the provider name by convention, so registering an adapter is
 * the only step needed to add a provider: `gemini` reads GEMINI_API_KEYS and GEMINI_MODEL.
 */
function envNames(provider: string) {
  const prefix = provider.toUpperCase();
  return { keys: `${prefix}_API_KEYS`, model: `${prefix}_MODEL` };
}

interface ProviderPool {
  provider: string;
  model: string;
  apiKeys: string[];
  /** Per-provider key cursor, so each provider rotates its own keys independently. */
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

// Built once and kept at module scope: env does not change during the process lifetime.
// The key cursors live inside these pools, so rebuilding also resets rotation.
let cachedPools: ProviderPool[] | null = null;

function getPools(): ProviderPool[] {
  cachedPools ??= buildPools();
  return cachedPools;
}

/**
 * Test only, to reload fake env between cases. Resets the rate limit window too: a suite that
 * reloads env would otherwise carry the previous case's calls into the next one.
 */
export function resetAiRouter(): void {
  cachedPools = null;
  resetAiRateLimit();
}

/**
 * The pools a route allows, most preferred first.
 *
 * The caller's order wins over the env order. `providers: ["anthropic", "gemini"]` means
 * "anthropic first, gemini if it fails" even when `AI_PROVIDERS` lists gemini first, because a
 * caller that bothers to name providers is expressing a preference, not repeating the config.
 * Names with no configured pool drop out, so asking for a provider this server has no keys for
 * narrows the list rather than erroring here; `takeAttempts` is where an empty result is caught.
 */
function selectPools(route?: AiRoute): ProviderPool[] {
  const pools = getPools();
  const wanted = route?.providers;
  if (!wanted?.length) return pools;

  return wanted.flatMap((name) => pools.filter((pool) => pool.provider === name));
}

/** With a route, answers "can this server serve *that* provider" rather than "any provider". */
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

/**
 * Failures worth repeating against the same slot.
 *
 * Only an overloaded model qualifies. It means the request was fine and the vendor was
 * momentarily busy, so a second attempt seconds later often succeeds.
 *
 * A rate limit is deliberately excluded even though it is also temporary. Providers quote
 * a retry delay in seconds (Gemini's free tier says things like "retry in 8s"), so hitting
 * the same key again after a sub-second pause cannot succeed and only spends more of the
 * quota. Falling over to a different provider or key still happens, because that path does
 * not depend on this set.
 *
 * A rejected key or an unreachable model fails identically every time, so neither is here.
 */
const RETRYABLE: ReadonlySet<string> = new Set([AI_MESSAGES.PROVIDER_OVERLOADED]);

function isRetryable(error: unknown): boolean {
  return error instanceof AppError && RETRYABLE.has(error.message);
}

/**
 * The pools to try for one call, always starting at the first provider the route allows.
 *
 * There is no provider cursor: the list is a fallback chain, so a healthy first provider
 * handles every call and the rest are only reached after a failure. Cycling past the end
 * means a lone provider is offered again, which only matters for a retryable failure; the
 * caller stops early otherwise. A route that names one provider therefore pins the call to
 * it: every attempt lands on the same pool, walking its keys.
 *
 * `distinctSlots` counts only the routed pools, so pinning to a provider with two keys still
 * gets both tried before the loop starts repeating a slot.
 *
 * Key cursors live in process memory, so key distribution is only approximately even across
 * multiple instances. Spreading load across keys is the goal, not an exact split.
 */
function takeAttempts(route?: AiRoute): { pools: ProviderPool[]; distinctSlots: number } {
  const pools = selectPools(route);
  if (pools.length === 0) {
    // Two different operator problems. An empty route means no AI at all; a route that asked
    // for providers and got nothing means those specific keys are missing from this server.
    throw new AppError({
      message: route?.providers?.length
        ? AI_MESSAGES.PROVIDER_NOT_AVAILABLE
        : AI_MESSAGES.NOT_CONFIGURED,
      statusCode: STATUS_CODE.SERVER_ERROR,
    });
  }

  return {
    pools: Array.from({ length: MAX_ATTEMPTS }, (_, offset) => pools[offset % pools.length]!),
    distinctSlots: pools.reduce((total, pool) => total + pool.apiKeys.length, 0),
  };
}

/**
 * Should the loop keep going after a failed attempt?
 *
 * While untried provider+key combinations remain, always move on: a different vendor or a
 * different key may simply work. Once they are exhausted, only a transient failure earns
 * another pass over the same slots.
 */
function shouldContinue(error: unknown, attemptsMade: number, distinctSlots: number): boolean {
  return attemptsMade < distinctSlots || isRetryable(error);
}

/** Back off before repeating a slot that just failed transiently. */
function backoff(attemptsMade: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * attemptsMade));
}

/** Resolve a pool into a concrete slot. Burns one key, so call it only when about to try. */
function toSlot(pool: ProviderPool): AiSlot {
  return { provider: pool.provider, model: pool.model, apiKey: takeKey(pool) };
}

/**
 * Call a model. A failing attempt (rate limit, dead key, provider outage) falls through to
 * the next provider; only when every attempt fails does the last error propagate.
 *
 * `route` restricts which providers this particular call may use. Leave it out unless the
 * caller genuinely needs a specific vendor, so the cheap provider keeps handling the rest.
 */
export async function chat(params: AiChatParams, route?: AiRoute): Promise<AiChatResult> {
  consumeAiRateLimit();
  const { pools, distinctSlots } = takeAttempts(route);
  let lastError: unknown;

  for (const [index, pool] of pools.entries()) {
    const provider = getProvider(pool.provider);
    if (!provider) continue;

    // Take the key here rather than up front: a call that succeeds on its first attempt
    // must not burn a key slot on the providers it never touched.
    try {
      return await provider.chat(params, toSlot(pool));
    } catch (error) {
      lastError = error;

      const attemptsMade = index + 1;
      if (!shouldContinue(error, attemptsMade, distinctSlots)) break;
      // Only pause when about to repeat a slot; moving to a fresh provider needs no wait.
      if (attemptsMade >= distinctSlots) await backoff(attemptsMade);
    }
  }

  throw lastError instanceof AppError
    ? lastError
    : new AppError({ message: AI_MESSAGES.PROVIDER_FAILED });
}

/** Streaming counterpart of `chat`, for the chatbox. Same rotation, same routing. */
export async function* chatStream(
  params: AiChatParams,
  route?: AiRoute
): AsyncIterable<string> {
  consumeAiRateLimit();
  const { pools, distinctSlots } = takeAttempts(route);
  let lastError: unknown;

  for (const [index, pool] of pools.entries()) {
    const provider = getProvider(pool.provider);
    if (!provider?.chatStream) continue;

    // Only switch providers while nothing has been emitted yet. Retrying after a partial
    // stream would hand the consumer the opening text twice.
    let emitted = false;
    try {
      for await (const chunk of provider.chatStream(params, toSlot(pool))) {
        emitted = true;
        yield chunk;
      }
      return;
    } catch (error) {
      if (emitted) throw error;
      lastError = error;

      const attemptsMade = index + 1;
      if (!shouldContinue(error, attemptsMade, distinctSlots)) break;
      if (attemptsMade >= distinctSlots) await backoff(attemptsMade);
    }
  }

  throw lastError instanceof AppError
    ? lastError
    : new AppError({ message: AI_MESSAGES.PROVIDER_FAILED });
}

const aiRouter = { chat, chatStream, isAiConfigured, listAiProviders, resetAiRouter };
export default aiRouter;
