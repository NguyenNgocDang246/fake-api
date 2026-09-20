export const ENDPOINT_PUBLIC_ID = "dddddddddddd";
export const SCENARIO_PUBLIC_ID = "eeeeeeeeeeee";

export const scenarioRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1n,
  public_id: SCENARIO_PUBLIC_ID,
  name: "Default",
  position: 0,
  is_active: true,
  status_code: 200,
  response_body: "{}",
  response_headers: "[]",
  delay_ms: 0,
  ai_enabled: false,
  ai_fields: [],
  ai_prompt: null,
  ai_plan: null,
  ai_plan_hash: null,
  ...overrides,
});

// The endpoint's own columns plus the scenarios a lookup included. The response lives on the
// scenario now, so a test wanting a different status or body sets it through `scenarioRow`.
export const endpointRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1n,
  public_id: ENDPOINT_PUBLIC_ID,
  path: "/x",
  method: "GET",
  scenarios: [scenarioRow()],
  ...overrides,
});

// Both write paths reconcile the scenarios alongside the endpoint, so they answer with both.
export const writeResult = (overrides: Record<string, unknown> = {}) => ({
  endpoint: endpointRow(overrides),
  scenario_ids: [SCENARIO_PUBLIC_ID],
});

// What the form submits: the address, the pager's rows, and which page it marked active.
export const writeBody = (scenarios: Record<string, unknown>[] = [{}]) => ({
  method: "GET",
  path: "/x",
  active_scenario: 0,
  scenarios: scenarios.map((scenario) => ({
    public_id: null,
    name: "Default",
    status_code: 200,
    response_body: "{}",
    response_headers: [],
    delay_ms: 0,
    ai_enabled: false,
    ai_fields: [],
    ai_prompt: null,
    ...scenario,
  })),
});
