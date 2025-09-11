import { ZodError } from "zod";
import { STATUS_CODE, ERROR_MESSAGES } from "@/core/constants";
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
  message: string;
  constructor({
    statusCode = STATUS_CODE.SERVER_ERROR,
    message = ERROR_MESSAGES.SERVER_ERROR,
  }: {
    statusCode?: STATUS_CODE;
    message?: string;
  } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
