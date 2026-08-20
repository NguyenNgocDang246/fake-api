import { AppError } from "@/server/core/errors";
import {
  AI_MESSAGES,
  AI_RATE_LIMIT_CALLS,
  AI_RATE_LIMIT_WINDOW_SECONDS,
  STATUS_CODE,
} from "@/server/core/constants";

/**
 * Sliding window in front of the model. One window for the whole process, not one per caller:
 * this is a throttle on how fast this server is willing to spend money, and it does not care
 * who asked.
 *
 * It is the only ceiling that no request can rewind. The per-role daily quota counts rows in
 * `endpoint_ai_variants`, so a preview escapes it (it stores nothing) and a create/delete loop
 * resets it (the rows cascade away). A window held in memory has neither weakness.
 *
 * What it does not do is cap the total: a caller who keeps to the rate can still spend all day
 * doing it. Bounding the total needs an append-only usage log, which the daily quota should be
 * counting instead of counting cache rows.
 */

interface RateLimitConfig {
  calls: number;
  windowMs: number;
}

/** Timestamps of the recent calls, oldest first. Trimmed on every check, so it stays small. */
let hits: number[] = [];

// `undefined` means "not read yet", `null` means "read, and the limit is off".
let cachedConfig: RateLimitConfig | null | undefined;

function readCount(name: string, fallback: number): number {
  const raw = (process.env[name] ?? "").trim();
  if (raw === "") return fallback;

  const value = Number(raw);
  // A typo must not silently remove the ceiling, so anything unusable falls back to the
  // constant rather than to zero. An explicit `0` is still honoured below as "off".
  if (!Number.isInteger(value) || value < 0) return fallback;
  return value;
}

/**
 * Configuration comes from env, both values optional:
 *   AI_RATE_LIMIT_CALLS=10
 *   AI_RATE_LIMIT_WINDOW_SECONDS=1
 *
 * The pair reads as "calls per window", so `10` and `1` is ten per second and `60` and `60` is
 * one per second averaged over a minute with bursts allowed. Either value at `0` turns the
 * limit off, which is meant for local work and load tests.
 */
function getConfig(): RateLimitConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;

  const calls = readCount("AI_RATE_LIMIT_CALLS", AI_RATE_LIMIT_CALLS);
  const windowSeconds = readCount("AI_RATE_LIMIT_WINDOW_SECONDS", AI_RATE_LIMIT_WINDOW_SECONDS);

  cachedConfig = calls > 0 && windowSeconds > 0 ? { calls, windowMs: windowSeconds * 1000 } : null;
  return cachedConfig;
}

/** Test only, to reload fake env and start from an empty window between cases. */
export function resetAiRateLimit(): void {
  cachedConfig = undefined;
  hits = [];
}

/** The active limit, or `null` when it is off. For the status route and for logs. */
export function getAiRateLimit(): RateLimitConfig | null {
  return getConfig();
}

/**
 * Record one call, or throw once the window is full.
 *
 * Counted per logical call rather than per provider attempt: a call that fails over to a second
 * provider is still one thing the caller asked for, and that chain has its own ceiling in
 * `MAX_ATTEMPTS`.
 */
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
