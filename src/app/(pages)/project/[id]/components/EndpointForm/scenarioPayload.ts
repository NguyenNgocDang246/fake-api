import {
  ClientCreateEndpointDTO,
  EndpointInfoDTO,
  ScenarioInfoDTO,
} from "@/models/endpoint/endpoint.model";
import {
  EndpointDesign,
  planEnvelopeOf,
} from "@/app/(pages)/project/[id]/components/AiEndpointSection/viewmodel";

// A row the author has just added. SameSite starts at Lax, which is the browser's own default for
// a cookie that names none, so a row left alone behaves the way the reader expects; a mock called
// from another origin is cross-site and wants None instead, which is one click away. `path` starts
// empty rather than at "/" so its placeholder is the thing naming the box, which is the only label
// it has; an empty path is stored as "/" anyway.
export function blankCookie(): ClientCreateEndpointDTO["scenarios"][number]["response_cookies"][number] {
  return {
    name: "",
    value: "",
    path: "",
    max_age: "",
    http_only: false,
    secure: false,
    same_site: "lax",
    partitioned: false,
  };
}

// The mirror of `String(scenario.delay_ms)` below: an input holds a string, and empty is the
// session cookie a stored `null` means.
function toClientCookie(
  cookie: ScenarioInfoDTO["response_cookies"][number]
): ClientCreateEndpointDTO["scenarios"][number]["response_cookies"][number] {
  return { ...cookie, max_age: cookie.max_age === null ? "" : String(cookie.max_age) };
}

// A page the author has just added: no row behind it yet, and the same empty response a new
// endpoint has always started on.
export function blankScenario(name: string): ClientCreateEndpointDTO["scenarios"][number] {
  return {
    public_id: null,
    name,
    status_code: "200",
    response_body: "",
    response_headers: [],
    response_cookies: [],
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
      response_cookies: scenario.response_cookies.map(toClientCookie),
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
