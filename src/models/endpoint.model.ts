import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";
import {
  buildFieldTree,
  collectSelectablePaths,
  getAtPath,
  isArrayPath,
} from "@/app/libs/helpers/json_path";

export const JsonSchema = z.string().transform((val, ctx) => {
  try {
    const parsed = JSON.parse(val);

    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return JSON.stringify(parsed);
    }
  } catch {
    // fallthrough to issue
  }

  ctx.addIssue({
    code: "custom",
    message: "response_body must be a valid JSON object",
  });
  return z.NEVER;
});

export const MAX_AI_FIELDS = 50;
export const MAX_AI_PROMPT_LENGTH = 500;

export const MAX_AI_ARRAY_ITEMS = 50;

export const MAX_AI_VALUES = 150;

export const MIN_STATUS_CODE = 100;
export const MAX_STATUS_CODE = 599;
export const MAX_DELAY_MS = 60_000;

function toInteger(value: number | string): number {
  if (typeof value === "number") return value;
  return value.trim() === "" ? NaN : Number(value);
}

function isIntegerInRange(value: number | string, min: number, max: number): boolean {
  const parsed = toInteger(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

function IntegerFromInput({ min, max, message }: { min: number; max: number; message: string }) {
  return z.union([z.number(), z.string()]).transform((value, ctx) => {
    if (!isIntegerInRange(value, min, max)) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return toInteger(value);
  });
}

export function countAiValues(body: unknown, paths: string[]): number {
  return paths.reduce((total, path) => {
    if (!isArrayPath(path)) return total + 1;

    const values = getAtPath(body, path, MAX_AI_ARRAY_ITEMS);
    return total + (Array.isArray(values) ? values.length : 0);
  }, 0);
}

export const EndpointSchema = z
  .object({
    public_id: PublicIdSchema,
    endpoint_groups_public_id: PublicIdSchema,
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z
      .string()
      .regex(/^\/(?:[a-zA-Z0-9_.~:@-]+(?:\/[a-zA-Z0-9_.~:@-]+)*)?$/, "Đường dẫn không hợp lệ")
      .max(255, "The path cannot be longer than 255 characters"),
    status_code: IntegerFromInput({
      min: MIN_STATUS_CODE,
      max: MAX_STATUS_CODE,
      message: `The status code must be a whole number between ${MIN_STATUS_CODE} and ${MAX_STATUS_CODE}`,
    }),
    response_body: JsonSchema,
    delay_ms: IntegerFromInput({
      min: 0,
      max: MAX_DELAY_MS,
      message: `The delay must be a whole number of milliseconds between 0 and ${MAX_DELAY_MS}`,
    }),
    ai_enabled: z.boolean().default(false),
    ai_fields: z
      .array(z.string())
      .max(MAX_AI_FIELDS, `You can select at most ${MAX_AI_FIELDS} fields`)
      .default([]),
    ai_prompt: z
      .string()
      .max(
        MAX_AI_PROMPT_LENGTH,
        `The hint cannot be longer than ${MAX_AI_PROMPT_LENGTH} characters`,
      )
      .nullable()
      .default(null),
  })
  .strict();
export type EndpointDTO = z.infer<typeof EndpointSchema>;

const JsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValue),
    z.record(z.string(), JsonValue),
  ]),
);

export const EndpointInfoSchema = EndpointSchema.omit({
  response_body: true,
  public_id: true,
  endpoint_groups_public_id: true,
})
  .extend({
    response_body: z.preprocess(
      (val) => {
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return val;
          }
        }
        return val;
      },
      z.record(z.string(), JsonValue),
    ),
  })
  .extend({ public_id: z.string(), endpoint_groups_id: z.string() })
  .strict();
export type EndpointInfoDTO = z.infer<typeof EndpointInfoSchema>;

export const EndpointResponseSchema = EndpointInfoSchema.pick({
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  delay_ms: true,
}).strict();
export type EndpointResponseDTO = z.infer<typeof EndpointResponseSchema>;

export const ClientCreateEndpointSchema = EndpointInfoSchema.pick({
  path: true,
  method: true,
})
  .extend({
    response_body: z.string(),
    delay_ms: z
      .string()
      .refine(
        (value) => isIntegerInRange(value, 0, MAX_DELAY_MS),
        `The delay must be a whole number of milliseconds between 0 and ${MAX_DELAY_MS}`,
      ),
    status_code: z
      .string()
      .refine(
        (value) => isIntegerInRange(value, MIN_STATUS_CODE, MAX_STATUS_CODE),
        `The status code must be a whole number between ${MIN_STATUS_CODE} and ${MAX_STATUS_CODE}`,
      ),
    // Spelled out rather than picked from EndpointSchema so these carry no `.default()`: a
    // default makes the zod input type optional while the output stays required, and the
    // Resolver needs one type for both.
    ai_enabled: z.boolean(),
    ai_fields: z.array(z.string()).max(MAX_AI_FIELDS, `You can select at most ${MAX_AI_FIELDS} fields`),
    ai_prompt: z
      .string()
      .max(MAX_AI_PROMPT_LENGTH, `The hint cannot be longer than ${MAX_AI_PROMPT_LENGTH} characters`)
      .nullable(),
  })
  .strict();
export type ClientCreateEndpointDTO = z.infer<typeof ClientCreateEndpointSchema>;

function checkAiFieldList(
  values: { ai_fields: string[]; response_body: string },
  ctx: z.RefinementCtx,
) {
  if (values.ai_fields.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["ai_fields"],
      message: "Select at least one field for the AI to vary",
    });
    return;
  }

  // `response_body` has already been through `JsonSchema`, so it parses to an object here.
  const body: unknown = JSON.parse(values.response_body);

  // The element cap has to match the generator's, or a path is refused over an element the
  // model would never have been asked to produce.
  const selectable = new Set(collectSelectablePaths(buildFieldTree(body, MAX_AI_ARRAY_ITEMS)));
  const unusable = values.ai_fields.filter((path) => !selectable.has(path));
  if (unusable.length > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["ai_fields"],
      message: `These fields cannot be varied by the AI: ${unusable.join(", ")}`,
    });
    return;
  }

  if (countAiValues(body, values.ai_fields) > MAX_AI_VALUES) {
    ctx.addIssue({
      code: "custom",
      path: ["ai_fields"],
      message: `This selection asks the AI for more than ${MAX_AI_VALUES} values at once. Select fewer fields, or a field over a shorter array.`,
    });
  }
}

function checkAiFields(
  values: { ai_enabled: boolean; ai_fields: string[]; response_body: string },
  ctx: z.RefinementCtx,
) {
  if (!values.ai_enabled) return;
  checkAiFieldList(values, ctx);
}

export const CreateEndpointSchema = EndpointSchema.pick({
  endpoint_groups_public_id: true,
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  delay_ms: true,
  ai_enabled: true,
  ai_fields: true,
  ai_prompt: true,
})
  .strict()
  .superRefine(checkAiFields);
export type CreateEndpointDTO = z.infer<typeof CreateEndpointSchema>;

export const DeleteAllEndpointSchema = EndpointSchema.pick({
  endpoint_groups_public_id: true,
}).strict();
export type DeleteAllEndpointDTO = z.infer<typeof DeleteAllEndpointSchema>;

export const ClientUpdateEndpointByIdSchema = ClientCreateEndpointSchema;
export type ClientUpdateEndpointByIdDTO = z.infer<typeof ClientUpdateEndpointByIdSchema>;

export const UpdateEndpointByIdSchema = EndpointSchema.pick({
  public_id: true,
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  delay_ms: true,
  ai_enabled: true,
  ai_fields: true,
  ai_prompt: true,
})
  .strict()
  .superRefine(checkAiFields);
export type UpdateEndpointByIdDTO = z.infer<typeof UpdateEndpointByIdSchema>;

export const ClientDeleteEndpointByIdDTO = EndpointInfoSchema.pick({
  public_id: true,
}).strict();
export type ClientDeleteEndpointByIdDTO = z.infer<typeof ClientDeleteEndpointByIdDTO>;

export const DeleteEndpointByIdSchema = EndpointSchema.pick({
  public_id: true,
}).strict();
export type DeleteEndpointByIdDTO = z.infer<typeof DeleteEndpointByIdSchema>;

export const GetEndpointByIdSchema = EndpointSchema.pick({
  public_id: true,
}).strict();
export type GetEndpointByIdDTO = z.infer<typeof GetEndpointByIdSchema>;

export function toEndpointInfoInput(
  endpoint: {
    public_id: string;
    path: string;
    method: string;
    status_code: number;
    response_body: string;
    delay_ms: number;
    ai_enabled: boolean;
    ai_fields: string[];
    ai_prompt: string | null;
  },
  endpoint_groups_id: string,
) {
  return {
    public_id: endpoint.public_id,
    path: endpoint.path,
    method: endpoint.method,
    status_code: endpoint.status_code,
    response_body: endpoint.response_body,
    delay_ms: endpoint.delay_ms,
    ai_enabled: endpoint.ai_enabled,
    ai_fields: endpoint.ai_fields,
    ai_prompt: endpoint.ai_prompt,
    endpoint_groups_id,
  };
}

export const AiPreviewSchema = EndpointSchema.pick({
  method: true,
  path: true,
  response_body: true,
  ai_fields: true,
  ai_prompt: true,
})
  .extend({ count: z.coerce.number().int().min(1).max(5).default(3) })
  .strict()
  .superRefine(checkAiFieldList);
export type AiPreviewDTO = z.infer<typeof AiPreviewSchema>;

export const getEndpointByPathSchema = EndpointSchema.pick({ path: true, method: true }).strict();
export type GetEndpointByPathDTO = z.infer<typeof getEndpointByPathSchema>;

export const EndpointMethod = EndpointSchema.pick({ method: true }).strict();
export type EndpointMethod = z.infer<typeof EndpointMethod>;
