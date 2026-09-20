import {
  ClientCreateEndpointDTO,
  EndpointInfoDTO,
  ScenarioInfoDTO,
} from "@/models/endpoint/endpoint.model";
import {
  EndpointDesign,
  planEnvelopeOf,
} from "@/app/(pages)/project/[id]/components/AiEndpointSection/viewmodel";

// A page the author has just added: no row behind it yet, and the same empty response a new
// endpoint has always started on.
export function blankScenario(name: string): ClientCreateEndpointDTO["scenarios"][number] {
  return {
    public_id: null,
    name,
    status_code: "200",
    response_body: "",
    response_headers: [],
    delay_ms: "0",
    ai_enabled: false,
    ai_fields: [],
    ai_prompt: null,
  };
}

// The designs the AI cards handed back, keyed by the field array's own row key rather than by
// index: removing a page shifts every index after it, and a design would follow the wrong row.
export type ScenarioDesigns = Map<string, EndpointDesign | null>;

// Each scenario carries its own blueprint, lifted back out server side by
// `splitScenarioPlanEnvelopes`. A parallel list keyed by index would desync on any reorder.
export function withScenarioPlans(
  data: ClientCreateEndpointDTO,
  keys: string[],
  designs: ScenarioDesigns
) {
  return {
    ...data,
    scenarios: data.scenarios.map((scenario, index) => ({
      ...scenario,
      ...planEnvelopeOf(designs.get(keys[index] ?? "") ?? null),
    })),
  };
}

// The scenario the mock is answering with, which is the one the list ships and the row draws its
// badges from. Falls back to the first page, the way the serving lookup does.
export function activeScenarioOf(endpoint: {
  scenarios: ScenarioInfoDTO[];
}): ScenarioInfoDTO | undefined {
  return endpoint.scenarios.find((scenario) => scenario.is_active) ?? endpoint.scenarios[0];
}

export function activeScenarioIndex(endpoint: { scenarios: ScenarioInfoDTO[] }): number {
  return Math.max(
    endpoint.scenarios.findIndex((scenario) => scenario.is_active),
    0
  );
}

// A stored endpoint as the form holds it: the numbers become the strings an input carries, and
// the body goes back to the text the author typed.
export function toClientEndpoint(endpoint: EndpointInfoDTO): ClientCreateEndpointDTO {
  return {
    method: endpoint.method,
    path: endpoint.path,
    active_scenario: activeScenarioIndex(endpoint),
    scenarios: endpoint.scenarios.map((scenario) => ({
      public_id: scenario.public_id,
      name: scenario.name,
      status_code: String(scenario.status_code),
      response_body: JSON.stringify(scenario.response_body),
      response_headers: scenario.response_headers,
      delay_ms: String(scenario.delay_ms),
      ai_enabled: scenario.ai_enabled,
      ai_fields: scenario.ai_fields,
      ai_prompt: scenario.ai_prompt,
    })),
  };
}

// Which stored scenarios already carry a blueprint, so each AI card can offer the first reroll
// free instead of designing what the row already holds.
export function storedPlansOf(endpoint: EndpointInfoDTO): Record<string, boolean> {
  return Object.fromEntries(
    endpoint.scenarios.map((scenario) => [scenario.public_id, scenario.ai_has_plan])
  );
}
