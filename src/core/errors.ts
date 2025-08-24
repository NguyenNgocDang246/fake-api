import { ZodError } from "zod";
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
