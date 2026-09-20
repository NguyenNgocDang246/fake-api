import { z } from "zod";
import { PublicIdSchema } from "@/app/libs/helpers/publicId";
import { VariantPlanSchema } from "@/models/endpoint_plan/endpoint_plan.model";
import { EndpointInfoSchema, EndpointSchema } from "@/models/endpoint/base.model";
import { checkAiFieldList } from "@/models/endpoint/ai_fields.model";
import {
  ClientScenarioSchema,
  MAX_SCENARIOS_PER_ENDPOINT,
  ScenarioInfoSchema,
  ScenarioSchema,
  ScenarioWriteSchema,
  TOO_MANY_SCENARIOS,
} from "@/models/endpoint/scenario.model";

export * from "@/models/endpoint/primitives.model";
export * from "@/models/endpoint/ai_fields.model";
export * from "@/models/endpoint/response_headers.model";
export * from "@/models/endpoint/scenario.model";
export * from "@/models/endpoint/base.model";

// A blueprint the caller already holds, so the preview route and the two write routes can take
// one instead of designing it again. Kept out of the client schema because `VariantPlanSchema`
// carries `.default()`s, and a `Resolver` needs one type for both zod input and output.
export const PlanEnvelopeSchema = z.object({
  plan: VariantPlanSchema.nullable().default(null),
  plan_hash: z.string().max(64).nullable().default(null),
});
export type PlanEnvelopeDTO = z.infer<typeof PlanEnvelopeSchema>;

// One envelope per scenario, lifted out of the row it arrived on. A parallel top-level list
// keyed by index would desync from `scenarios` on any add, remove or reorder and the server
// could not tell; producing both from the same map cannot.
export function splitScenarioPlanEnvelopes(body: unknown): {
  envelopes: unknown[];
  endpoint: Record<string, unknown>;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { envelopes: [], endpoint: {} };
  }

  const { scenarios, ...rest } = body as Record<string, unknown>;
  if (!Array.isArray(scenarios)) return { envelopes: [], endpoint: { ...rest, scenarios } };

  const envelopes: unknown[] = [];
  const stripped = scenarios.map((row) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      envelopes.push({});
      return row;
    }
    const { plan, plan_hash, ...scenario } = row as Record<string, unknown>;
    envelopes.push({ plan, plan_hash });
    return scenario;
  });

  return { envelopes, endpoint: { ...rest, scenarios: stripped } };
}

// Which page the pager opened on, as a position rather than an id: a scenario the author just
// added has no `public_id` yet, so there is nothing else to name it by on a create.
function checkActiveScenario(
  values: { scenarios: unknown[]; active_scenario: number },
  ctx: z.RefinementCtx
) {
  if (values.active_scenario >= values.scenarios.length) {
    ctx.addIssue({
      code: "custom",
      path: ["active_scenario"],
      message: "The active scenario is not one of the scenarios being saved",
    });
  }
}

const ScenarioListSchema = z
  .array(ScenarioWriteSchema)
  .min(1, "An endpoint needs at least one scenario")
  .max(MAX_SCENARIOS_PER_ENDPOINT, TOO_MANY_SCENARIOS);

export const ClientCreateEndpointSchema = EndpointInfoSchema.pick({
  path: true,
  method: true,
})
  .extend({
    scenarios: z.array(ClientScenarioSchema),
    active_scenario: z.number().int().min(0),
  })
  .strict();
export type ClientCreateEndpointDTO = z.infer<typeof ClientCreateEndpointSchema>;

export const ClientUpdateEndpointByIdSchema = ClientCreateEndpointSchema;
export type ClientUpdateEndpointByIdDTO = z.infer<typeof ClientUpdateEndpointByIdSchema>;

// Only what `endpoints` still holds. The scenario rows are written by the reconcile, which
// builds their payload explicitly, so nothing here is ever spread into a Prisma update.
const WRITABLE_FIELDS = {
  method: true,
  path: true,
} as const;

export const CreateEndpointSchema = EndpointSchema.pick({
  endpoint_groups_public_id: true,
  ...WRITABLE_FIELDS,
})
  .extend({
    scenarios: ScenarioListSchema,
    active_scenario: z.number().int().min(0),
  })
  .strict()
  .superRefine(checkActiveScenario);
export type CreateEndpointDTO = z.infer<typeof CreateEndpointSchema>;

export const UpdateEndpointByIdSchema = EndpointSchema.pick({
  public_id: true,
  ...WRITABLE_FIELDS,
})
  .extend({
    scenarios: ScenarioListSchema,
    active_scenario: z.number().int().min(0),
  })
  .strict()
  .superRefine(checkActiveScenario);
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

export const GetScenarioByIdSchema = ScenarioSchema.pick({ public_id: true }).strict();
export type GetScenarioByIdDTO = z.infer<typeof GetScenarioByIdSchema>;

export const getEndpointByPathSchema = EndpointSchema.pick({ path: true, method: true }).strict();
export type GetEndpointByPathDTO = z.infer<typeof getEndpointByPathSchema>;

export const EndpointMethod = EndpointSchema.pick({ method: true }).strict();
export type EndpointMethod = z.infer<typeof EndpointMethod>;

export const AiPreviewSchema = EndpointSchema.pick({ method: true, path: true })
  .extend(
    ScenarioSchema.pick({ response_body: true, ai_fields: true, ai_prompt: true }).shape
  )
  .extend({
    count: z.coerce.number().int().min(1).max(5).default(3),
    // The second way to a free reroll: a scenario that already stores a blueprint is named
    // rather than carried, so the list does not have to ship every plan.
    scenario_id: PublicIdSchema.nullable().default(null),
    ...PlanEnvelopeSchema.shape,
  })
  .strict()
  .superRefine(checkAiFieldList);
export type AiPreviewDTO = z.infer<typeof AiPreviewSchema>;

// `plan` is passed in rather than read here: deriving it needs `loadPlan`, which hashes with
// `node:crypto`, and this file is imported by client components.
export function toScenarioInfoInput(
  scenario: {
    public_id: string;
    name: string;
    position: number;
    is_active: boolean;
    status_code: number;
    response_body: string;
    response_headers: string;
    delay_ms: number;
    ai_enabled: boolean;
    ai_fields: string[];
    ai_prompt: string | null;
  },
  plan?: { unsupported_language: string | null; unapplied_hints: string[] }
) {
  // Listed one by one, not spread: `ScenarioInfoSchema` is `.strict()` and the caller hands in
  // a whole prisma row, so a spread would leak `id`, `ai_plan` and the timestamps into it.
  return {
    public_id: scenario.public_id,
    name: scenario.name,
    position: scenario.position,
    is_active: scenario.is_active,
    status_code: scenario.status_code,
    response_body: scenario.response_body,
    response_headers: scenario.response_headers,
    delay_ms: scenario.delay_ms,
    ai_enabled: scenario.ai_enabled,
    ai_fields: scenario.ai_fields,
    ai_prompt: scenario.ai_prompt,
    ai_unsupported_language: plan?.unsupported_language ?? null,
    ai_unapplied_hints: plan?.unapplied_hints ?? [],
    ai_has_plan: plan !== undefined,
  };
}

export function toEndpointInfoInput(
  endpoint: { public_id: string; path: string; method: string },
  endpoint_groups_id: string,
  scenarios: z.input<typeof ScenarioInfoSchema>[]
) {
  return {
    public_id: endpoint.public_id,
    path: endpoint.path,
    method: endpoint.method,
    endpoint_groups_id,
    scenarios,
  };
}
