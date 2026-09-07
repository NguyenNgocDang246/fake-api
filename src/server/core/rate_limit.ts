import { AppError } from "@/server/core/errors";
import { STATUS_CODE } from "@/server/core/constants";

interface RateLimiterOptions {
  callsEnv: string;
  windowEnv: string;
  fallbackCalls: number;
  fallbackWindowSeconds: number;
  message: string;
}

interface RateLimitConfig {
  calls: number;
  windowMs: number;
}

function readCount(name: string, fallback: number): number {
  const raw = (process.env[name] ?? "").trim();
  if (raw === "") return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return fallback;
  return value;
}

// The counted-per-key counterpart of `ai/ai_rate_limit.ts`, which counts one global stream.
// Hits live in this instance's memory, so several deployed instances each count on their own.
export function createRateLimiter({
  callsEnv,
  windowEnv,
  fallbackCalls,
  fallbackWindowSeconds,
  message,
}: RateLimiterOptions) {
  const hits = new Map<string, number[]>();

  // `undefined` means "not read yet", `null` means "read, and the limit is off".
  let cachedConfig: RateLimitConfig | null | undefined;

  function getConfig(): RateLimitConfig | null {
    if (cachedConfig !== undefined) return cachedConfig;

    const calls = readCount(callsEnv, fallbackCalls);
    const windowSeconds = readCount(windowEnv, fallbackWindowSeconds);

    cachedConfig = calls > 0 && windowSeconds > 0 ? { calls, windowMs: windowSeconds * 1000 } : null;
    return cachedConfig;
  }

  return {
    reset(): void {
      cachedConfig = undefined;
      hits.clear();
    },

    consume(key: string): void {
      const config = getConfig();
      if (!config) return;

      const now = Date.now();
      const cutoff = now - config.windowMs;

      const recent = (hits.get(key) ?? []).filter((at) => at > cutoff);
      if (recent.length >= config.calls) {
        // Put the pruned list back so a blocked key stops growing while it keeps knocking.
        hits.set(key, recent);
        throw new AppError({ message, statusCode: STATUS_CODE.TOO_MANY_REQUESTS });
      }

      recent.push(now);
      hits.set(key, recent);

      // Keys that went quiet are dropped, otherwise the map only ever grows.
      for (const [otherKey, timestamps] of hits) {
        if (otherKey !== key && timestamps.every((at) => at <= cutoff)) hits.delete(otherKey);
      }
    },
  };
}
