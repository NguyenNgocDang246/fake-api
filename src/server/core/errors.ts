import { ZodError } from "zod";
import { STATUS_CODE, ERROR_MESSAGES } from "@/server/core/constants";
export class ErrorValidation {
  message: string;
  field: string;

  constructor(issue: { message: string; field: string }) {
    this.message = issue.message;
    this.field = issue.field;
  }

  static fromZodError(error: ZodError) {
    return error.issues.map(
      (issue) =>
        new ErrorValidation({
          message: issue.message,
          field: String(issue.path[0] ?? ""),
        })
    );
  }
}

export class AppError extends Error {
  statusCode: STATUS_CODE;
  override message: string;
  /**
   * The original failure, when this error wraps one.
   *
   * `message` is user-facing and deliberately vague, so without this the real cause would
   * be lost the moment a third-party error is normalized. Never send it to a client.
   */
  override cause?: unknown;

  constructor({
    statusCode = STATUS_CODE.SERVER_ERROR,
    message = ERROR_MESSAGES.SERVER_ERROR,
    cause,
  }: {
    statusCode?: STATUS_CODE;
    message?: string;
    cause?: unknown;
  } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    if (cause !== undefined) this.cause = cause;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
