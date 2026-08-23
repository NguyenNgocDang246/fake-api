export enum ENDPOINT_MESSAGES {
  ENDPOINT_DUPLICATED = "This endpoint already exists.",
}

export const AI_POOL_SIZE = 10;
export const AI_POOL_LOW_WATER = 3;
export const AI_VARIANT_MAX_USES = 2;
export const AI_REFILL_LOCK_MS = 180_000;

export const AI_CONTEXT_FULL_CHARS = 4_000;
export const AI_CONTEXT_ARRAY_SAMPLE = 2;
export const AI_CONTEXT_STRING_CHARS = 120;
export const AI_CONTEXT_MAX_DEPTH = 6;
export const AI_CONTEXT_MAX_CHARS = 12_000;

export const AI_MAX_OUTPUT_TOKENS = 8_000;
export const AI_TOKENS_PER_VALUE = 24;

export const AI_MIN_OUTPUT_TOKENS = 1_024;

// Fraction of the output budget kept back for thinking, which is billed against it too.
export const AI_THINKING_RESERVE = 0.4;
