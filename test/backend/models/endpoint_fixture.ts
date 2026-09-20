export const VALID_SCENARIO = {
  public_id: null,
  name: "Default",
  status_code: 200,
  response_body: '{"name":"An"}',
  response_headers: [],
  delay_ms: 0,
};

export const VALID = {
  endpoint_groups_public_id: "cccccccccccc",
  method: "GET" as const,
  path: "/users",
  scenarios: [VALID_SCENARIO],
  active_scenario: 0,
};
