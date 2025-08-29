// constants/messages.ts
export enum ERROR_MESSAGES {
  VALIDATION_FAILED = "Validation failed",
  UNAUTHORIZED = "Unauthorized",
  NOT_FOUND = "Resource not found",
  NO_CONTENT = "No content",
  SERVER_ERROR = "Internal server error",
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
