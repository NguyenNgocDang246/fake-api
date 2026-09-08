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
  PAYLOAD_TOO_LARGE = 413,
  TOO_MANY_REQUESTS = 429,
  SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

export enum LIMIT_MESSAGES {
  PROJECT_LIMIT_REACHED = "You have reached the maximum number of projects allowed for your account.",
  ENDPOINT_GROUP_LIMIT_REACHED = "You have reached the maximum number of groups allowed for this project.",
  ENDPOINT_LIMIT_REACHED = "You have reached the maximum number of endpoints allowed for this group.",
  AI_PLAN_LIMIT_REACHED = "Your AI usage is on limit.",
  AI_PLAN_LIMIT_REACHED_ON_SAVE = "This change needs a new AI design, and your AI usage is on limit.",
  AI_NOT_AVAILABLE_FOR_ROLE = "AI response variants are not available for your account.",
}
