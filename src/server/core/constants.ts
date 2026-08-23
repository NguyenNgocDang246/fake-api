export const ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS = 5 * 60;
export const ACCESS_TOKEN_EXPIRATION_TIME_IN_STRING = "5m";
export const REFRESH_TOKEN_EXPIRATION_TIME_IN_SECONDS = 7 * 24 * 60 * 60;
export const REFRESH_TOKEN_EXPIRATION_TIME_IN_STRING = "7d";
export const RESET_PASSWORD_TOKEN_EXPIRATION_TIME_IN_SECONDS = 5 * 60;
export const RESET_PASSWORD_TOKEN_EXPIRATION_TIME_IN_STRING = "5m";
export const VERIFY_EMAIL_TOKEN_EXPIRATION_TIME_IN_SECONDS = 24 * 60 * 60;
export const VERIFY_EMAIL_TOKEN_EXPIRATION_TIME_IN_STRING = "24h";

export enum ERROR_MESSAGES {
  VALIDATION_FAILED = "Some information seems incorrect. Please check and try again.",
  UNAUTHORIZED = "You need to log in to continue.",
  FORBIDDEN = "You don't have permission to perform this action.",
  NOT_FOUND = "We couldn't find what you were looking for.",
  NO_CONTENT = "There's no data to display right now.",
  METHOD_NOT_ALLOWED = "This method is not allowed for this resource.",
  SERVER_ERROR = "Something went wrong on our side. Please try again later.",
  UNEXPECTED_ERROR = "An unexpected error occurred. Please try again.",
}

export enum SUCCESS_MESSAGES {
  CREATED = "Resource created successfully",
  UPDATED = "Resource updated successfully",
  DELETED = "Resource deleted successfully",
}

export enum RESPONSE_STATUS {
  SUCCESS = "success",
  ERROR = "error",
}

export enum STATUS_CODE {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

export enum AUTH_MESSAGES {
  EMAIL_NOT_VERIFIED = "Please verify your email.",

  EMAIL_NOT_FOUND = "We couldn't find an account with that email.",
  EMAIL_DUPLICATED = "This email is already registered. Try signing in instead.",

  USER_ALREADY_EXISTS = "An account with this information already exists.",
  USER_NOT_FOUND = "We couldn't find an account with that information.",
  INVALID_CREDENTIALS = "Incorrect email or password. Please try again.",
  INVALID_CURRENT_PASSWORD = "Your current password is incorrect.",
}


export enum GOOGLE_AUTH_MESSAGES {
  NO_CODE = "Authorization code is missing.",
  NO_EMAIL = "Email address is missing.",
  NO_NAME = "User name is missing.",
  INVALID_STATE = "Invalid or missing OAuth state.",
}

export const OAUTH_STATE_COOKIE = "oauth_state";
export const OAUTH_STATE_EXPIRATION_TIME_IN_SECONDS = 600;

export enum ENDPOINT_MESSAGES {
  ENDPOINT_DUPLICATED = "This endpoint already exists.",
}

export enum LIMIT_MESSAGES {
  PROJECT_LIMIT_REACHED = "You have reached the maximum number of projects allowed for your account.",
  ENDPOINT_GROUP_LIMIT_REACHED = "You have reached the maximum number of groups allowed for this project.",
  ENDPOINT_LIMIT_REACHED = "You have reached the maximum number of endpoints allowed for this group.",
  AI_VARIANT_LIMIT_REACHED = "You have reached the maximum number of AI generations allowed for today.",
}

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

// Read as "calls per window", so this pair is ten per second. Used when the env vars are unset.
export const AI_RATE_LIMIT_CALLS = 10;
export const AI_RATE_LIMIT_WINDOW_SECONDS = 1;

export const AI_REQUEST_TIMEOUT_MS = 30_000;

export const AI_TOTAL_BUDGET_MS = 45_000;

export enum TOKEN_MESSAGE {
  INVALID_TOKEN = "The token provided is invalid.",
  EXPIRED_TOKEN = "The token has expired.",
  INVALID_EXPIRED_TOKEN = "The token is invalid or has expired.",
  INVALID_REFRESH_TOKEN = "The refresh token provided is invalid.",
  EXPIRED_REFRESH_TOKEN = "The refresh token has expired.",
  INVALID_EXPIRED_REFRESH_TOKEN = "The refresh token is invalid or has expired.",
}
