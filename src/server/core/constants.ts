export const ACCESS_TOKEN_EXPIRATION_TIME_IN_SECONDS = 5 * 60;
export const ACCESS_TOKEN_EXPIRATION_TIME_IN_STRING = "5m";
export const REFRESH_TOKEN_EXPIRATION_TIME_IN_SECONDS = 7 * 24 * 60 * 60;
export const REFRESH_TOKEN_EXPIRATION_TIME_IN_STRING = "7d";

export enum ERROR_MESSAGES {
  VALIDATION_FAILED = "Validation failed",
  UNAUTHORIZED = "Unauthorized",
  NOT_FOUND = "Resource not found",
  NO_CONTENT = "No content",
  SERVER_ERROR = "Internal server error",
  UNEXPECTED_ERROR = "Unexpected error",
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
  SERVER_ERROR = 500,
}

export enum AUTH_MESSAGES {
  EMAIL_NOT_FOUND = "Email not found",
  EMAIL_DUPLICATED = "Email already exists",

  USER_ALREADY_EXISTS = "User already exists",
  INVALID_CREDENTIALS = "Invalid credentials",
}

export enum TOKEN_MESSAGE {
  INVALID_TOKEN = "Invalid token",
  EXPIRED_TOKEN = "Expired token",
  INVALID_EXPIRED_TOKEN = "Invalid or expired token",
  INVALID_REFRESH_TOKEN = "Invalid refresh token",
  EXPIRED_REFRESH_TOKEN = "Expired refresh token",
  INVALID_EXPIRED_REFRESH_TOKEN = "Invalid or expired refresh token",
}
