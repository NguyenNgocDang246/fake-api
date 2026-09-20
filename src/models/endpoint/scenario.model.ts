import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";
import { AiPromptSchema, MAX_AI_FIELDS, checkAiFields } from "@/models/endpoint/ai_fields.model";
import {
  EMPTY_RESPONSE_HEADERS,
  ResponseHeaderListSchema,
  ResponseHeaderReadListSchema,
  ResponseHeadersFromInput,
  parseResponseHeaders,
} from "@/models/endpoint/response_headers.model";
import {
  IntegerFromInput,
  JsonSchema,
  JsonValue,
  MAX_DELAY_MS,
  MAX_STATUS_CODE,
  MIN_STATUS_CODE,
  isIntegerInRange,
} from "@/models/endpoint/primitives.model";

export const MAX_SCENARIO_NAME_LENGTH = 100;

// The absolute bound, which is the highest role's allowance. `ROLE_LIMITS` reads it rather than
// restating it, and the per-role ceiling stays a route check since a schema cannot see the role.
export const MAX_SCENARIOS_PER_ENDPOINT = 10;

export const TOO_MANY_SCENARIOS = `An endpoint can hold at most ${MAX_SCENARIOS_PER_ENDPOINT} scenarios`;

const ScenarioNameSchema = z
  .string()
  .trim()
  .min(1, "A scenario needs a name")
  .max(
    MAX_SCENARIO_NAME_LENGTH,
    `The name cannot be longer than ${MAX_SCENARIO_NAME_LENGTH} characters`
  );

export const ScenarioSchema = z
  .object({
    public_id: PublicIdSchema,
    name: ScenarioNameSchema,
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
export type ScenarioDTO = z.infer<typeof ScenarioSchema>;

// `null` is a row the author has just added and no table has seen yet, which is what tells the
// reconcile to create rather than update.
export const ScenarioWriteSchema = ScenarioSchema.omit({ public_id: true })
  .extend({ public_id: PublicIdSchema.nullable().default(null) })
  .strict()
  .superRefine(checkAiFields);
export type ScenarioWriteDTO = z.infer<typeof ScenarioWriteSchema>;

export const ScenarioInfoSchema = ScenarioSchema.omit({
  response_body: true,
  public_id: true,
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
  .extend({
    public_id: z.string(),
    position: z.number().int(),
    is_active: z.boolean(),
  })
  // Read only, and deliberately absent from `ScenarioSchema`: these come out of the stored
  // blueprint, so a client must never be able to send them in on a create or update.
  .extend({
    ai_unsupported_language: z.string().nullable().default(null),
    ai_unapplied_hints: z.array(z.string()).default([]),
    // The blueprint itself stays on the server: it is up to `MAX_PLAN_BYTES` per scenario and a
    // list carries every row. This flag is all the form needs to offer a free reroll.
    ai_has_plan: z.boolean().default(false),
  })
  .strict();
export type ScenarioInfoDTO = z.infer<typeof ScenarioInfoSchema>;

// The form's own shape: every number is the string an input holds, and nothing carries a
// `.default()`, because a default makes the zod input type optional while the output stays
// required and a `Resolver` needs one type for both.
export const ClientScenarioSchema = z
  .object({
    public_id: z.string().nullable(),
    name: ScenarioNameSchema,
    response_body: z.string(),
    response_headers: ResponseHeaderListSchema,
    delay_ms: z
      .string()
      .refine(
        (value) => isIntegerInRange(value, 0, MAX_DELAY_MS),
        `The delay must be a whole number of milliseconds between 0 and ${MAX_DELAY_MS}`
      ),
    status_code: z
      .string()
      .refine(
        (value) => isIntegerInRange(value, MIN_STATUS_CODE, MAX_STATUS_CODE),
        `The status code must be a whole number between ${MIN_STATUS_CODE} and ${MAX_STATUS_CODE}`
      ),
    ai_enabled: z.boolean(),
    ai_fields: z
      .array(z.string())
      .max(MAX_AI_FIELDS, `You can select at most ${MAX_AI_FIELDS} fields`),
    ai_prompt: AiPromptSchema.nullable(),
  })
  .strict();
export type ClientScenarioDTO = z.infer<typeof ClientScenarioSchema>;
