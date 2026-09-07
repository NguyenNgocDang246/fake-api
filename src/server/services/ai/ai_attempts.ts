import { AppError } from "@/server/core/errors";
import { STATUS_CODE } from "@/server/core/constants";
import { AI_MESSAGES } from "@/server/services/ai/ai.constants";
import { AiProvider, AiRoute } from "@/server/services/ai/ai.types";
import { getProvider } from "@/server/services/ai/providers";
import { ProviderPool, selectPools } from "@/server/services/ai/ai_pool";

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 400;

const RETRYABLE: ReadonlySet<string> = new Set([AI_MESSAGES.PROVIDER_OVERLOADED]);
const NO_FAILOVER: ReadonlySet<string> = new Set([AI_MESSAGES.PROVIDER_REJECTED_REQUEST]);

function isRetryable(error: unknown): boolean {
  return error instanceof AppError && RETRYABLE.has(error.message);
}

function isFatal(error: unknown): boolean {
  return error instanceof AppError && NO_FAILOVER.has(error.message);
}

export function takeAttempts(
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

export function shouldContinue(
  error: unknown,
  attemptsMade: number,
  distinctSlots: number
): boolean {
  if (isFatal(error)) return false;
  return attemptsMade < distinctSlots || isRetryable(error);
}

export function backoff(attemptsMade: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * attemptsMade));
}

export function getProviderOrThrow(name: string): AiProvider {
  const provider = getProvider(name);
  if (!provider) {
    throw new AppError({
      message: AI_MESSAGES.PROVIDER_NOT_AVAILABLE,
      statusCode: STATUS_CODE.SERVER_ERROR,
    });
  }
  return provider;
}

export function finalError(lastError: unknown): AppError {
  return lastError instanceof AppError
    ? lastError
    : new AppError({ message: AI_MESSAGES.PROVIDER_FAILED });
}
