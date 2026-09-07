export enum ENDPOINT_MESSAGES {
  ENDPOINT_DUPLICATED = "This endpoint already exists.",
}

// Raised while designing or serving a blueprint. They keep the `AI_` subject the way the tuning
// below does, but every one of them is about this feature's response body and field selection
// rather than about the LLM layer, so `../ai/` must not carry them.
export enum ENDPOINT_AI_MESSAGES {
  NO_FIELDS_SELECTED = "Select at least one field before generating variants.",
  FIELDS_NOT_PATCHABLE = "The selected fields can no longer be varied. Please choose them again.",
  FIELDS_TOO_LARGE = "Too many values to generate at once. Select fewer fields, or a smaller array.",
  INVALID_BASE_BODY = "The response body must be a valid JSON object before generating variants.",
  NO_USABLE_VARIANT = "The AI provider returned no usable variant. Please try again.",
  REQUEST_TOO_LARGE = "This request is too large to preview. Use a smaller response body.",
  // Separate from PROVIDER_FAILED because the fix is the caller's, not a wait: the blueprint the
  // body and field list ask for does not fit, so retrying the same request fails identically.
  PLAN_TOO_LARGE = "This response body needs a blueprint too large to build. Select fewer fields, or use a smaller response body.",
}

// Lock for building a blueprint, doubling as the cooldown before a failed build is retried.
export const AI_PLAN_LOCK_MS = 180_000;

// How much of the body is shown to the model as context when it designs a blueprint. The body is
// written by the user, so `AI_CONTEXT_MAX_CHARS` is also the ceiling on how much text an author
// can put in front of the model at all.
export const AI_CONTEXT_FULL_CHARS = 3_000;
export const AI_CONTEXT_ARRAY_SAMPLE = 2;
export const AI_CONTEXT_STRING_CHARS = 120;
export const AI_CONTEXT_MAX_DEPTH = 6;
export const AI_CONTEXT_MAX_CHARS = 8_000;

// Ceiling on the preview request body. Checked before the JSON is parsed, because Zod's `.max()`
// on a collection only runs once every element has already been parsed, which is too late to
// stop an oversized payload from costing anything. Has to hold an escaped `MAX_RESPONSE_BODY_CHARS`
// body plus a `MAX_PLAN_BYTES` blueprint, with room to spare.
export const AI_PREVIEW_MAX_REQUEST_BYTES = 96_000;

// What one design is allowed to spend, not what a blueprint is allowed to be: `MAX_PLAN_BYTES` is
// that. Kept above what a full blueprint costs in tokens so thinking has room, since a truncated
// answer is charged in full and produces nothing.
export const AI_PLAN_MAX_OUTPUT_TOKENS = 10_000;
