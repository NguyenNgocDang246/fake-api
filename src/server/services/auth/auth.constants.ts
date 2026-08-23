export const ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS = 5 * 60;
export const ACCESS_TOKEN_EXPIRATION_TIME_IN_STRING = "5m";
export const REFRESH_TOKEN_EXPIRATION_TIME_IN_SECONDS = 7 * 24 * 60 * 60;
export const REFRESH_TOKEN_EXPIRATION_TIME_IN_STRING = "7d";
export const RESET_PASSWORD_TOKEN_EXPIRATION_TIME_IN_SECONDS = 5 * 60;
export const RESET_PASSWORD_TOKEN_EXPIRATION_TIME_IN_STRING = "5m";
export const VERIFY_EMAIL_TOKEN_EXPIRATION_TIME_IN_SECONDS = 24 * 60 * 60;
export const VERIFY_EMAIL_TOKEN_EXPIRATION_TIME_IN_STRING = "24h";

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

export enum TOKEN_MESSAGE {
  INVALID_TOKEN = "The token provided is invalid.",
  EXPIRED_TOKEN = "The token has expired.",
  INVALID_EXPIRED_TOKEN = "The token is invalid or has expired.",
  INVALID_REFRESH_TOKEN = "The refresh token provided is invalid.",
  EXPIRED_REFRESH_TOKEN = "The refresh token has expired.",
  INVALID_EXPIRED_REFRESH_TOKEN = "The refresh token is invalid or has expired.",
}
