import { z } from "zod";
import ApiResponse from "./api_response";
import { ERROR_MESSAGES, STATUS_CODE } from "./constants";
import { ErrorValidation } from "./errors";

export function validateData<T>(
  data: unknown,
  schema: [z.ZodSchema<T>]
):
  | { success: true; data: T[] }
  | { success: false; response: ReturnType<typeof ApiResponse.error> };

export function validateData<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; response: ReturnType<typeof ApiResponse.error> };

export function validateData<T>(data: unknown, schema: z.ZodSchema<T> | [z.ZodSchema<T>]) {
  let effectiveSchema: z.ZodTypeAny;

  if (Array.isArray(schema)) {
    // Truyền [schema] -> coi như z.array(schema[0])
    effectiveSchema = z.array(schema[0]);
  } else {
    // Truyền schema thường
    if (Array.isArray(data)) {
      effectiveSchema = z.array(schema);
    } else {
      effectiveSchema = schema;
    }
  }

  const result = effectiveSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      response: ApiResponse.error({
        errors: ErrorValidation.fromZodError(result.error),
        message: ERROR_MESSAGES.VALIDATION_FAILED,
        statusCode: STATUS_CODE.BAD_REQUEST,
      }),
    };
  }

  return { success: true, data: result.data };
}