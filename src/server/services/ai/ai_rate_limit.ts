import { AppError } from "@/server/core/errors";
import {
  AI_MESSAGES,
  AI_RATE_LIMIT_CALLS,
  AI_RATE_LIMIT_WINDOW_SECONDS,
  STATUS_CODE,
} from "@/server/core/constants";

interface RateLimitConfig {
  calls: number;
  windowMs: number;
}

let hits: number[] = [];

// `undefined` means "not read yet", `null` means "read, and the limit is off".
let cachedConfig: RateLimitConfig | null | undefined;

function readCount(name: string, fallback: number): number {
  const raw = (process.env[name] ?? "").trim();
  if (raw === "") return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) return fallback;
  return value;
}

function getConfig(): RateLimitConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;

  const calls = readCount("AI_RATE_LIMIT_CALLS", AI_RATE_LIMIT_CALLS);
  const windowSeconds = readCount("AI_RATE_LIMIT_WINDOW_SECONDS", AI_RATE_LIMIT_WINDOW_SECONDS);

  cachedConfig = calls > 0 && windowSeconds > 0 ? { calls, windowMs: windowSeconds * 1000 } : null;
  return cachedConfig;
}

export function resetAiRateLimit(): void {
  cachedConfig = undefined;
  hits = [];
}

export function consumeAiRateLimit(): void {
  const config = getConfig();
  if (!config) return;

  const now = Date.now();
  const cutoff = now - config.windowMs;

  hits = hits.filter((at) => at > cutoff);
  if (hits.length >= config.calls) {
    throw new AppError({
      message: AI_MESSAGES.TOO_MANY_REQUESTS,
      statusCode: STATUS_CODE.TOO_MANY_REQUESTS,
    });
  }

  hits.push(now);
}
