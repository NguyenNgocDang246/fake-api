// What the serving lookups now hand back: the endpoint's address, plus the one scenario the
// query ordered to the front. The route reads the response off that scenario, so a test that
// wants a different status or body sets it here rather than on the endpoint.
export function servable(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> & { scenarios: Record<string, unknown>[] } {
  const { method, path, scenarios, ...scenario } = overrides;

  return {
    method: method ?? "GET",
    path: path ?? "/users",
    scenarios: (scenarios as Record<string, unknown>[]) ?? [
      {
        id: 1n,
        public_id: "aaaaaaaaaaaa",
        name: "Default",
        position: 0,
        is_active: true,
        status_code: 200,
        response_body: "{}",
        response_headers: "[]",
        response_cookies: "[]",
        delay_ms: 0,
        ai_enabled: false,
        ai_fields: [],
        ai_prompt: null,
        ai_plan: null,
        ai_plan_hash: null,
        ...scenario,
      },
    ],
  };
}

// The mocked endpoint service, shaped the way every fake-route test needs it. `servingScenarioOf`
// keeps its real behaviour: it is a pure reader over the row above, and stubbing it would only
// hide the ordering the lookup is responsible for.
export function endpointServiceMock() {
  return {
    __esModule: true,
    default: {
      getServableEndpointByPath: jest.fn(),
      getServableEndpointByDynamicPath: jest.fn(),
      findMethodsForPath: jest.fn(),
    },
    servingScenarioOf: (endpoint: { scenarios?: unknown[] } | null) =>
      endpoint?.scenarios?.[0] ?? null,
  };
}
