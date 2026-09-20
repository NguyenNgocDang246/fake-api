import { toScenarioInfoInput } from "@/models/endpoint/endpoint.model";
import endpointVariantPlanService, {
  PlanScenario,
} from "@/server/services/endpoint/variant/plan.service";

type ScenarioRow = Parameters<typeof toScenarioInfoInput>[0] &
  Omit<PlanScenario, "id" | "method" | "path">;

// One stored scenario as the wire sees it. `planInfoOf` is what decides whether the row carries
// a usable blueprint, and the blueprint itself never leaves the server.
export function scenarioInfoOf(scenario: ScenarioRow) {
  return toScenarioInfoInput(scenario, endpointVariantPlanService.planInfoOf(scenario));
}

// The shape the blueprint layer works in: the scenario's own columns, plus the address of the
// endpoint it hangs off, which the prompt reads as context.
export function planScenarioOf(
  scenario: {
    id: bigint;
    response_body: string;
    ai_enabled: boolean;
    ai_fields: string[];
    ai_prompt: string | null;
    ai_plan: string | null;
    ai_plan_hash: string | null;
    is_active: boolean;
  },
  endpoint: { method: string; path: string }
): PlanScenario & { is_active: boolean } {
  return {
    id: scenario.id,
    method: endpoint.method,
    path: endpoint.path,
    response_body: scenario.response_body,
    ai_enabled: scenario.ai_enabled,
    ai_fields: scenario.ai_fields,
    ai_prompt: scenario.ai_prompt,
    ai_plan: scenario.ai_plan,
    ai_plan_hash: scenario.ai_plan_hash,
    is_active: scenario.is_active,
  };
}
