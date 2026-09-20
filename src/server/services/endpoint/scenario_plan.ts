import ApiResponse from "@/server/core/api_response";
import { STATUS_CODE } from "@/server/core/constants";
import {
  ENDPOINT_AI_MESSAGES,
  AI_PREVIEW_MAX_REQUEST_BYTES,
} from "@/server/services/endpoint/endpoint.constants";
import { PlanEnvelopeDTO, ScenarioWriteDTO } from "@/models/endpoint/endpoint.model";
import endpointVariantPlanService, {
  PlanOrigin,
  PlanScenario,
  PlanSubject,
} from "@/server/services/endpoint/variant/plan.service";

// What one scenario of a save looks like to the blueprint layer: the values being written, the
// blueprint the client sent with it, and what the row held before, which is `null` for a
// scenario the author has just added.
export interface ScenarioPlanInput {
  row: ScenarioWriteDTO;
  envelope: PlanEnvelopeDTO;
  stored: {
    ai_plan: string | null;
    ai_plan_hash: string | null;
    origin: PlanOrigin;
  } | null;
}

function subjectOf(input: ScenarioPlanInput): PlanSubject {
  return {
    response_body: input.row.response_body,
    ai_enabled: input.row.ai_enabled,
    ai_fields: input.row.ai_fields,
    ai_prompt: input.row.ai_prompt,
    ai_plan: input.stored?.ai_plan ?? null,
    ai_plan_hash: input.stored?.ai_plan_hash ?? null,
  };
}

// Every scenario is asked, not only the one the pager marked active. A save carrying three AI
// scenarios claims three designs, and a refusal that counted one would let the other two through
// to answer with the base body forever without saying so.
export function countDesigns(inputs: ScenarioPlanInput[]): number {
  return inputs.filter((input) =>
    endpointVariantPlanService.wouldDesign(
      subjectOf(input),
      input.envelope.plan,
      input.envelope.plan_hash,
      input.stored?.origin ?? null
    )
  ).length;
}

export function hasAiEnabled(rows: ScenarioWriteDTO[]): boolean {
  return rows.some((row) => row.ai_enabled);
}

// A client that sent fewer envelopes than scenarios is saying those pages carry no blueprint,
// which is the same thing an empty envelope says.
export function envelopeAt(envelopes: PlanEnvelopeDTO[], index: number): PlanEnvelopeDTO {
  return envelopes[index] ?? { plan: null, plan_hash: null };
}

// Reads the request body once, refusing an oversized one before it is parsed. A reconcile
// carries one body per scenario, so the payload grows with the pager in a way the single
// response this route used to take never did.
export async function readWriteBody(req: {
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}): Promise<{ ok: true; body: unknown } | { ok: false; response: ReturnType<typeof ApiResponse.error> }> {
  const tooLarge = () => ({
    ok: false as const,
    response: ApiResponse.error({
      message: ENDPOINT_AI_MESSAGES.REQUEST_TOO_LARGE,
      statusCode: STATUS_CODE.PAYLOAD_TOO_LARGE,
    }),
  });

  // Before the parse, not after: a collection's `.max()` only runs once every element has been
  // parsed, so by then an oversized payload has already cost that work.
  if (Number(req.headers.get("content-length") ?? 0) > AI_PREVIEW_MAX_REQUEST_BYTES) {
    return tooLarge();
  }

  // A chunked request declares no length, so the header alone would let it through.
  const raw = await req.text();
  if (raw.length > AI_PREVIEW_MAX_REQUEST_BYTES) return tooLarge();

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: true, body: null };
  }
}

// Runs past the response, in `after()`, so nothing here may throw at a caller. Adopting and
// carrying forward are free, so every scenario gets them; only the active one is designed, since
// N model calls on one save is minutes of work and N quota burns for pages nobody may open. The
// rest build on their first request, which the fake route already does for a missing blueprint.
export async function settleScenarioPlans(
  scenarios: (PlanScenario & { is_active: boolean })[],
  inputs: ScenarioPlanInput[]
): Promise<void> {
  for (const [index, scenario] of scenarios.entries()) {
    const input = inputs[index];
    if (!input) continue;

    const { plan, plan_hash } = input.envelope;
    if (plan && plan_hash) {
      if (await endpointVariantPlanService.adoptPlan(scenario, plan, plan_hash)) continue;
    }

    if (input.stored) {
      if (await endpointVariantPlanService.carryPlanForward(scenario, input.stored.origin)) {
        continue;
      }
      // Neither the client's blueprint nor the stored one survived this edit, so the stored one
      // goes, and with it the retry cooldown the same column carries.
      if (input.stored.ai_plan) await endpointVariantPlanService.clearPlan(scenario.id);
    }

    if (!scenario.ai_enabled || scenario.ai_fields.length === 0) continue;
    if (scenario.is_active) await endpointVariantPlanService.ensurePlan(scenario);
  }
}
