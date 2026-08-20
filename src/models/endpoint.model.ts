import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";

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

/**
 * Upper bound on how many array elements get regenerated. A path like `items[].price` over
 * a 5000 element array would make the model return 5000 values per variant, so only the
 * first N elements are varied.
 *
 * It lives in the model file because both the UI (which shows the limit next to the
 * checkbox) and the service (which caps the array before calling the model) need the very
 * same number.
 */
export const MAX_AI_ARRAY_ITEMS = 50;

export const EndpointSchema = z
  .object({
    public_id: PublicIdSchema,
    endpoint_groups_public_id: PublicIdSchema,
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z
      .string()
      .regex(/^\/(?:[a-zA-Z0-9_.~:@-]+(?:\/[a-zA-Z0-9_.~:@-]+)*)?$/, "Đường dẫn không hợp lệ")
      .max(255, "The path cannot be longer than 255 characters"),
    status_code: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
    response_body: JsonSchema,
    delay_ms: z.union([z.number(), z.string().transform((str) => parseInt(str, 10))]),
    // AI options. Existing endpoints do not send these three, so each has a default.
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
    delay_ms: z.string(),
    status_code: z.string(),
    // Spelled out rather than picked from EndpointSchema so the AI fields carry no
    // `.default()`. A default makes the zod input type optional while the output type is
    // required, and react-hook-form's Resolver needs one type for both. The form always
    // supplies these three through `defaultValues`, so a default here buys nothing.
    ai_enabled: z.boolean(),
    ai_fields: z.array(z.string()).max(MAX_AI_FIELDS, `You can select at most ${MAX_AI_FIELDS} fields`),
    ai_prompt: z
      .string()
      .max(MAX_AI_PROMPT_LENGTH, `The hint cannot be longer than ${MAX_AI_PROMPT_LENGTH} characters`)
      .nullable(),
  })
  .strict();
export type ClientCreateEndpointDTO = z.infer<typeof ClientCreateEndpointSchema>;

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
}).strict();
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
}).strict();
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

/**
 * Shape one `endpoints` row into the input `EndpointInfoSchema` expects.
 *
 * Four routes (GET all, POST, GET by id, PUT) return the same shape, so it lives here and
 * adding a field means editing one place.
 */
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

/**
 * Previewing variants from the form, including before the endpoint has been saved. That is
 * why this schema takes the form contents directly instead of referencing a stored endpoint.
 */
export const AiPreviewSchema = EndpointSchema.pick({
  method: true,
  path: true,
  response_body: true,
  ai_fields: true,
  ai_prompt: true,
})
  .extend({ count: z.coerce.number().int().min(1).max(5).default(3) })
  .strict();
export type AiPreviewDTO = z.infer<typeof AiPreviewSchema>;

export const getEndpointByPathSchema = EndpointSchema.pick({ path: true, method: true }).strict();
export type GetEndpointByPathDTO = z.infer<typeof getEndpointByPathSchema>;

export const EndpointMethod = EndpointSchema.pick({ method: true }).strict();
export type EndpointMethod = z.infer<typeof EndpointMethod>;
