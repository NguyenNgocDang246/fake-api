import {
  CreateEndpointSchema,
  MAX_ARRAY_ITEMS,
  MAX_SCENARIOS_PER_ENDPOINT,
  MAX_SCENARIO_NAME_LENGTH,
  ScenarioInfoSchema,
  ScenarioWriteSchema,
  splitScenarioPlanEnvelopes,
} from "@/models/endpoint/endpoint.model";
import { VALID, VALID_SCENARIO } from "./endpoint_fixture";

const parse = (overrides: Record<string, unknown>) =>
  CreateEndpointSchema.safeParse({ ...VALID, ...overrides });

const scenarios = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ ...VALID_SCENARIO, name: `Case ${i}` }));

describe("a scenario's name", () => {
  const parseScenario = (overrides: Record<string, unknown>) =>
    ScenarioWriteSchema.safeParse({ ...VALID_SCENARIO, ...overrides });

  it("takes the name the author typed", () => {
    expect(parseScenario({ name: "Unauthorized" }).data?.name).toBe("Unauthorized");
  });

  it("trims it, so two names differing by a space are not two names", () => {
    expect(parseScenario({ name: "  Admin  " }).data?.name).toBe("Admin");
  });

  it("refuses a name that is blank once trimmed", () => {
    expect(parseScenario({ name: "   " }).success).toBe(false);
  });

  it("refuses a name past the column's width", () => {
    expect(parseScenario({ name: "x".repeat(MAX_SCENARIO_NAME_LENGTH) }).success).toBe(true);
    expect(parseScenario({ name: "x".repeat(MAX_SCENARIO_NAME_LENGTH + 1) }).success).toBe(false);
  });
});

// `null` is how a row the author just added says it has no row yet, which is what tells the
// reconcile to create rather than update. An absent key means the same thing.
describe("a scenario's public_id decides create from update", () => {
  it("defaults to null when the form leaves it out", () => {
    const { public_id: _dropped, ...withoutId } = VALID_SCENARIO;

    expect(ScenarioWriteSchema.safeParse(withoutId).data?.public_id).toBeNull();
  });

  it("keeps an id the author is editing under", () => {
    expect(ScenarioWriteSchema.safeParse({ ...VALID_SCENARIO, public_id: "aaaaaaaaaaaa" }).data)
      .toMatchObject({ public_id: "aaaaaaaaaaaa" });
  });

  it("refuses something that is not a public id at all", () => {
    expect(ScenarioWriteSchema.safeParse({ ...VALID_SCENARIO, public_id: "nope" }).success).toBe(
      false
    );
  });
});

describe("the scenarios an endpoint is written with", () => {
  it("refuses an endpoint with no scenario, since a mock would have nothing to answer", () => {
    expect(parse({ scenarios: [] }).success).toBe(false);
  });

  it("takes as many as the highest role is allowed", () => {
    expect(parse({ scenarios: scenarios(MAX_SCENARIOS_PER_ENDPOINT) }).success).toBe(true);
  });

  // The per-role ceiling is the route's job, since a schema cannot see the role. This one is the
  // absolute bound, and it is what gives the form a message next to the field.
  it("refuses more than any role could ever have", () => {
    const result = parse({ scenarios: scenarios(MAX_SCENARIOS_PER_ENDPOINT + 1) });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(String(MAX_SCENARIOS_PER_ENDPOINT));
  });

  it("holds active_scenario to a position the array actually has", () => {
    expect(parse({ scenarios: scenarios(3), active_scenario: 2 }).success).toBe(true);
    expect(parse({ scenarios: scenarios(3), active_scenario: 3 }).success).toBe(false);
    expect(parse({ active_scenario: -1 }).success).toBe(false);
  });

  it("names the scenario that broke a rule, so the pager can mark that page", () => {
    const result = parse({
      scenarios: [VALID_SCENARIO, { ...VALID_SCENARIO, status_code: "abc" }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["scenarios", 1, "status_code"]);
  });

  it("checks the AI selection of each scenario against that scenario's own body", () => {
    const result = parse({
      scenarios: [
        { ...VALID_SCENARIO, ai_enabled: true, ai_fields: ["name"] },
        { ...VALID_SCENARIO, ai_enabled: true, ai_fields: ["missing"] },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["scenarios", 1, "ai_fields"]);
  });
});

// A parallel top-level `plans: []` would desync from `scenarios` on any add, remove or reorder,
// and the server could not tell. Lifting each envelope out of the row it came from cannot.
describe("splitScenarioPlanEnvelopes", () => {
  it("lifts one envelope per scenario, in the order they arrived", () => {
    const { envelopes, endpoint } = splitScenarioPlanEnvelopes({
      method: "GET",
      scenarios: [
        { name: "a", plan: { kind: "first" }, plan_hash: "h1" },
        { name: "b", plan: null, plan_hash: null },
      ],
    });

    expect(envelopes).toEqual([
      { plan: { kind: "first" }, plan_hash: "h1" },
      { plan: null, plan_hash: null },
    ]);
    expect(endpoint).toEqual({ method: "GET", scenarios: [{ name: "a" }, { name: "b" }] });
  });

  it("leaves the scenario rows with nothing the strict write schema would refuse", () => {
    const { endpoint } = splitScenarioPlanEnvelopes({
      scenarios: [{ ...VALID_SCENARIO, plan: {}, plan_hash: "h" }],
    });

    expect(ScenarioWriteSchema.safeParse((endpoint["scenarios"] as unknown[])[0]).success).toBe(
      true
    );
  });

  it("answers with empty rather than throwing on a body that is not an object", () => {
    expect(splitScenarioPlanEnvelopes(null)).toEqual({ envelopes: [], endpoint: {} });
    expect(splitScenarioPlanEnvelopes([1, 2])).toEqual({ envelopes: [], endpoint: {} });
  });

  it("hands a non-array `scenarios` straight through, for the schema to refuse", () => {
    const { envelopes, endpoint } = splitScenarioPlanEnvelopes({ scenarios: "nope" });

    expect(envelopes).toEqual([]);
    expect(endpoint).toEqual({ scenarios: "nope" });
  });
});

// Reading carries none of the write rules: a row stored before a rule existed must not take the
// whole endpoint list down with it.
describe("ScenarioInfoSchema reads what the write path would now refuse", () => {
  const stored = {
    public_id: "aaaaaaaaaaaa",
    name: "Default",
    position: 0,
    is_active: true,
    status_code: 200,
    response_body: JSON.stringify({ list: Array.from({ length: MAX_ARRAY_ITEMS + 10 }, () => 0) }),
    response_headers: "[]",
    delay_ms: 0,
    ai_enabled: false,
    ai_fields: [],
    ai_prompt: null,
  };

  it("loads a body holding a longer array than a write would accept", () => {
    expect(ScenarioWriteSchema.safeParse({ ...VALID_SCENARIO, ...stored }).success).toBe(false);
    expect(ScenarioInfoSchema.safeParse(stored).success).toBe(true);
  });

  it("hands the body back parsed and the headers back as rows", () => {
    const result = ScenarioInfoSchema.safeParse({
      ...stored,
      response_body: '{"name":"An"}',
      response_headers: '[{"name":"x-page","value":"1"}]',
    });

    expect(result.data?.response_body).toEqual({ name: "An" });
    expect(result.data?.response_headers).toEqual([{ name: "x-page", value: "1" }]);
  });
});
