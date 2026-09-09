import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";
import { AiPromptSchema, MAX_AI_FIELDS } from "@/models/endpoint/ai_fields.model";
import {
  EMPTY_RESPONSE_HEADERS,
  ResponseHeaderReadListSchema,
  ResponseHeadersFromInput,
  parseResponseHeaders,
} from "@/models/endpoint/response_headers.model";
import {
  IntegerFromInput,
  JsonSchema,
  JsonValue,
  MAX_DELAY_MS,
  MAX_PATH_LENGTH,
  MAX_STATUS_CODE,
  MIN_STATUS_CODE,
} from "@/models/endpoint/primitives.model";

export const EndpointSchema = z
  .object({
    public_id: PublicIdSchema,
    endpoint_groups_public_id: PublicIdSchema,
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
    path: z
      .string()
      .regex(/^\/(?:[a-zA-Z0-9_.~:@-]+(?:\/[a-zA-Z0-9_.~:@-]+)*)?$/, "The path is not valid")
      .max(MAX_PATH_LENGTH, `The path cannot be longer than ${MAX_PATH_LENGTH} characters`),
    status_code: IntegerFromInput({
      min: MIN_STATUS_CODE,
      max: MAX_STATUS_CODE,
      message: `The status code must be a whole number between ${MIN_STATUS_CODE} and ${MAX_STATUS_CODE}`,
    }),
    response_body: JsonSchema,
    response_headers: ResponseHeadersFromInput().default(EMPTY_RESPONSE_HEADERS),
    delay_ms: IntegerFromInput({
      min: 0,
      max: MAX_DELAY_MS,
      message: `The delay must be a whole number of milliseconds between 0 and ${MAX_DELAY_MS}`,
    }),
    ai_enabled: z.boolean().default(false),
    ai_fields: z
      .array(z.string())
      // Deduped before the cap, so a repeated path costs neither a slot nor a second recipe.
      .transform((paths) => [...new Set(paths)])
      .refine(
        (paths) => paths.length <= MAX_AI_FIELDS,
        `You can select at most ${MAX_AI_FIELDS} fields`
      )
      .default([]),
    ai_prompt: AiPromptSchema.nullable().default(null),
  })
  .strict();
export type EndpointDTO = z.infer<typeof EndpointSchema>;

export const EndpointInfoSchema = EndpointSchema.omit({
  response_body: true,
  public_id: true,
  endpoint_groups_public_id: true,
})
  .extend({
    response_body: z.preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    }, z.record(z.string(), JsonValue)),
    // The column holds text, every reader here wants the rows, and reading never enforces the
    // write rules: a row that would fail them must not take the whole response down with it.
    response_headers: z.preprocess(parseResponseHeaders, ResponseHeaderReadListSchema),
  })
  .extend({ public_id: z.string(), endpoint_groups_id: z.string() })
  // Read only, and deliberately absent from `EndpointSchema`: these come out of the stored
  // blueprint, so a client must never be able to send them in on a create or update.
  .extend({
    ai_unsupported_language: z.string().nullable().default(null),
    ai_unapplied_hints: z.array(z.string()).default([]),
    // The blueprint itself stays on the server: it is up to `MAX_PLAN_BYTES` per endpoint and a
    // list carries every row. This flag is all the form needs to offer a free reroll.
    ai_has_plan: z.boolean().default(false),
  })
  .strict();
export type EndpointInfoDTO = z.infer<typeof EndpointInfoSchema>;

export const EndpointResponseSchema = EndpointInfoSchema.pick({
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  response_headers: true,
  delay_ms: true,
}).strict();
export type EndpointResponseDTO = z.infer<typeof EndpointResponseSchema>;
