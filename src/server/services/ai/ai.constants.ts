export enum AI_MESSAGES {
  NOT_CONFIGURED = "AI generation is not configured on this server.",
  PROVIDER_NOT_AVAILABLE = "The AI provider this feature requires is not configured on this server.",
  NO_FIELDS_SELECTED = "Select at least one field before generating variants.",
  FIELDS_NOT_PATCHABLE = "The selected fields can no longer be varied. Please choose them again.",
  FIELDS_TOO_LARGE = "Too many values to generate at once. Select fewer fields, or a smaller array.",
  INVALID_BASE_BODY = "The response body must be a valid JSON object before generating variants.",
  RATE_LIMITED = "The AI provider is rate limiting requests. Please try again shortly.",
  TOO_MANY_REQUESTS = "Too many AI requests. Please wait a moment and try again.",
  PROVIDER_OVERLOADED = "The AI provider is temporarily overloaded. Please try again shortly.",
  PROVIDER_TIMEOUT = "The AI provider took too long to answer. Please try again.",
  PROVIDER_AUTH_FAILED = "The AI provider rejected the configured credentials.",
  MODEL_NOT_AVAILABLE = "The configured AI model is not available for these credentials.",
  PROVIDER_REJECTED_REQUEST = "The AI provider rejected the request as malformed.",
  PROVIDER_FAILED = "The AI provider could not complete the request.",
  NO_USABLE_VARIANT = "The AI provider returned no usable variant. Please try again.",
}

// Read as "calls per window", so this pair is ten per second. Used when the env vars are unset.
export const AI_RATE_LIMIT_CALLS = 10;
export const AI_RATE_LIMIT_WINDOW_SECONDS = 1;

export const AI_REQUEST_TIMEOUT_MS = 30_000;

export const AI_TOTAL_BUDGET_MS = 45_000;
