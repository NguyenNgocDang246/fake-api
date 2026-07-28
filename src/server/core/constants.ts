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
  SERVER_ERROR = 500,
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
}

export enum ENDPOINT_MESSAGES {
  ENDPOINT_DUPLICATED = "This endpoint already exists.",
}

export enum LIMIT_MESSAGES {
  PROJECT_LIMIT_REACHED = "You have reached the maximum number of projects allowed for your account.",
  ENDPOINT_GROUP_LIMIT_REACHED = "You have reached the maximum number of groups allowed for this project.",
  ENDPOINT_LIMIT_REACHED = "You have reached the maximum number of endpoints allowed for this group.",
}

export enum TOKEN_MESSAGE {
  INVALID_TOKEN = "The token provided is invalid.",
  EXPIRED_TOKEN = "The token has expired.",
  INVALID_EXPIRED_TOKEN = "The token is invalid or has expired.",
  INVALID_REFRESH_TOKEN = "The refresh token provided is invalid.",
  EXPIRED_REFRESH_TOKEN = "The refresh token has expired.",
  INVALID_EXPIRED_REFRESH_TOKEN = "The refresh token is invalid or has expired.",
}
