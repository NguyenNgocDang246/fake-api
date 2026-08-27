import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";
import { VariantPlanSchema } from "@/models/endpoint_plan/endpoint_plan.model";
import { EndpointInfoSchema, EndpointSchema } from "@/models/endpoint/base.model";
import {
  MAX_AI_FIELDS,
  MAX_AI_PROMPT_LENGTH,
  checkAiFieldList,
  checkAiFields,
} from "@/models/endpoint/ai_fields.model";
import {
  MAX_DELAY_MS,
  MAX_STATUS_CODE,
  MIN_STATUS_CODE,
  isIntegerInRange,
} from "@/models/endpoint/primitives.model";

export * from "@/models/endpoint/primitives.model";
export * from "@/models/endpoint/ai_fields.model";
export * from "@/models/endpoint/base.model";

// A blueprint the caller already holds, so the preview route and the two write routes can take
// one instead of designing it again. Kept out of the client schema because `VariantPlanSchema`
// carries `.default()`s, and a `Resolver` needs one type for both zod input and output.
export const PlanEnvelopeSchema = z.object({
  plan: VariantPlanSchema.nullable().default(null),
  plan_hash: z.string().max(64).nullable().default(null),
});
export type PlanEnvelopeDTO = z.infer<typeof PlanEnvelopeSchema>;

// The write DTOs are `.strict()` and feed Prisma directly, so a blueprint travelling with a
// create or update has to be lifted out before the rest is validated as an endpoint.
export function splitPlanEnvelope(body: unknown): {
  envelope: Record<string, unknown>;
  endpoint: Record<string, unknown>;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { envelope: {}, endpoint: {} };
  }

  const { plan, plan_hash, ...endpoint } = body as Record<string, unknown>;
  return { envelope: { plan, plan_hash }, endpoint };
}

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
        `The delay must be a whole number of milliseconds between 0 and ${MAX_DELAY_MS}`
      ),
    status_code: z
      .string()
      .refine(
        (value) => isIntegerInRange(value, MIN_STATUS_CODE, MAX_STATUS_CODE),
        `The status code must be a whole number between ${MIN_STATUS_CODE} and ${MAX_STATUS_CODE}`
      ),
    // Spelled out rather than picked from EndpointSchema so these carry no `.default()`: a
    // default makes the zod input type optional while the output stays required, and the
    // Resolver needs one type for both.
    ai_enabled: z.boolean(),
    ai_fields: z
      .array(z.string())
      .max(MAX_AI_FIELDS, `You can select at most ${MAX_AI_FIELDS} fields`),
    ai_prompt: z
      .string()
      .max(MAX_AI_PROMPT_LENGTH, `The hint cannot be longer than ${MAX_AI_PROMPT_LENGTH} characters`)
      .nullable(),
  })
  .strict();
export type ClientCreateEndpointDTO = z.infer<typeof ClientCreateEndpointSchema>;

export const ClientUpdateEndpointByIdSchema = ClientCreateEndpointSchema;
export type ClientUpdateEndpointByIdDTO = z.infer<typeof ClientUpdateEndpointByIdSchema>;

const WRITABLE_FIELDS = {
  method: true,
  path: true,
  status_code: true,
  response_body: true,
  delay_ms: true,
  ai_enabled: true,
  ai_fields: true,
  ai_prompt: true,
} as const;

export const CreateEndpointSchema = EndpointSchema.pick({
  endpoint_groups_public_id: true,
  ...WRITABLE_FIELDS,
})
  .strict()
  .superRefine(checkAiFields);
export type CreateEndpointDTO = z.infer<typeof CreateEndpointSchema>;

export const UpdateEndpointByIdSchema = EndpointSchema.pick({
  public_id: true,
  ...WRITABLE_FIELDS,
})
  .strict()
  .superRefine(checkAiFields);
export type UpdateEndpointByIdDTO = z.infer<typeof UpdateEndpointByIdSchema>;

export const DeleteAllEndpointSchema = EndpointSchema.pick({
  endpoint_groups_public_id: true,
}).strict();
export type DeleteAllEndpointDTO = z.infer<typeof DeleteAllEndpointSchema>;

export const ClientDeleteEndpointByIdDTO = EndpointInfoSchema.pick({
  public_id: true,
}).strict();
export type ClientDeleteEndpointByIdDTO = z.infer<typeof ClientDeleteEndpointByIdDTO>;

export const DeleteEndpointByIdSchema = EndpointSchema.pick({ public_id: true }).strict();
export type DeleteEndpointByIdDTO = z.infer<typeof DeleteEndpointByIdSchema>;

export const GetEndpointByIdSchema = EndpointSchema.pick({ public_id: true }).strict();
export type GetEndpointByIdDTO = z.infer<typeof GetEndpointByIdSchema>;

export const getEndpointByPathSchema = EndpointSchema.pick({ path: true, method: true }).strict();
export type GetEndpointByPathDTO = z.infer<typeof getEndpointByPathSchema>;

export const EndpointMethod = EndpointSchema.pick({ method: true }).strict();
export type EndpointMethod = z.infer<typeof EndpointMethod>;

export const AiPreviewSchema = EndpointSchema.pick({
  method: true,
  path: true,
  response_body: true,
  ai_fields: true,
  ai_prompt: true,
})
  .extend({
    count: z.coerce.number().int().min(1).max(5).default(3),
    // The second way to a free reroll: an endpoint that already stores a blueprint is named
    // rather than carried, so the update form gets one without the list shipping every plan.
    endpoint_id: PublicIdSchema.nullable().default(null),
    ...PlanEnvelopeSchema.shape,
  })
  .strict()
  .superRefine(checkAiFieldList);
export type AiPreviewDTO = z.infer<typeof AiPreviewSchema>;

// `plan` is passed in rather than read here: deriving it needs `loadPlan`, which hashes with
// `node:crypto`, and this file is imported by client components.
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
  plan?: { unsupported_language: string | null; unapplied_hints: string[] }
) {
  // Listed one by one, not spread: `EndpointInfoSchema` is `.strict()` and the caller hands in
  // a whole prisma row, so a spread would leak `id`, `ai_plan` and the timestamps into it.
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
    ai_unsupported_language: plan?.unsupported_language ?? null,
    ai_unapplied_hints: plan?.unapplied_hints ?? [],
    ai_has_plan: plan !== undefined,
    endpoint_groups_id,
  };
}
