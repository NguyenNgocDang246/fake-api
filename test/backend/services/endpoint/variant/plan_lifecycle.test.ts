import {
  endpointVariantPlanService,
  planHash,
  splitSelection,
  BODY,
  FIELDS,
  PLAN,
  endpoint,
} from "./plan_harness";

describe("planHash", () => {
  const base = { responseBody: BODY, aiFields: FIELDS, aiPrompt: null };

  it("ignores whitespace in the body and order in the field list", () => {
    expect(planHash({ ...base, responseBody: JSON.stringify(JSON.parse(BODY), null, 4) })).toBe(
      planHash(base)
    );
    expect(planHash({ ...base, aiFields: ["age", "name"] })).toBe(planHash(base));
  });

  it("changes when the body, the selection or the hint changes", () => {
    expect(planHash({ ...base, responseBody: '{"name":"Binh","age":3}' })).not.toBe(planHash(base));
    expect(planHash({ ...base, aiFields: ["name"] })).not.toBe(planHash(base));
    expect(planHash({ ...base, aiPrompt: "use a uuid" })).not.toBe(planHash(base));
  });

  it("treats an empty hint and no hint as the same", () => {
    expect(planHash({ ...base, aiPrompt: "   " })).toBe(planHash({ ...base, aiPrompt: null }));
  });
});

describe("splitSelection", () => {
  it("separates value paths from the array containers whose length may vary", () => {
    const base: unknown = JSON.parse(BODY);
    const { valueFields, arrayPaths } = splitSelection(base, [
      "name",
      "items",
      "items[].price",
    ]);

    expect(valueFields.map((field) => field.path)).toEqual(["name", "items[].price"]);
    expect(arrayPaths).toEqual(["items"]);
  });
});

describe("loadPlan / isPlanStale", () => {
  it("returns the stored blueprint when the hash still matches", () => {
    expect(endpointVariantPlanService.loadPlan(endpoint())).toMatchObject({ version: 1 });
    expect(endpointVariantPlanService.isPlanStale(endpoint())).toBe(false);
  });

  it("treats a changed body, selection or hint as stale", () => {
    expect(
      endpointVariantPlanService.isPlanStale(endpoint({ response_body: '{"name":"B","age":1}' }))
    ).toBe(true);
    expect(endpointVariantPlanService.isPlanStale(endpoint({ ai_fields: ["name"] }))).toBe(true);
    expect(endpointVariantPlanService.isPlanStale(endpoint({ ai_prompt: "uuid" }))).toBe(true);
  });

  it("does not treat a reordered selection as stale", () => {
    expect(endpointVariantPlanService.isPlanStale(endpoint({ ai_fields: ["age", "name"] }))).toBe(
      false
    );
  });

  it("treats a missing, unparseable or malformed blueprint as stale", () => {
    expect(endpointVariantPlanService.isPlanStale(endpoint({ ai_plan: null }))).toBe(true);
    expect(endpointVariantPlanService.isPlanStale(endpoint({ ai_plan: "{not json" }))).toBe(true);
    expect(
      endpointVariantPlanService.isPlanStale(
        endpoint({ ai_plan: JSON.stringify({ version: 1, fields: [{ path: "a", recipe: {} }] }) })
      )
    ).toBe(true);
  });

  it("reports no blueprint when AI is off or nothing is selected", () => {
    expect(endpointVariantPlanService.loadPlan(endpoint({ ai_enabled: false }))).toBeNull();
    expect(endpointVariantPlanService.loadPlan(endpoint({ ai_fields: [] }))).toBeNull();
  });
});

describe("planInfoOf", () => {
  // The `PLAN` fixture predates `unsupported_language`, so this is also the backward compatibility
  // check: a blueprint stored before the field existed must still load, defaulted rather than
  // rejected, or every endpoint in the database would quietly rebuild.
  it("defaults a blueprint stored without the field instead of refusing it", () => {
    expect(endpointVariantPlanService.planInfoOf(endpoint())).toEqual({
      unsupported_language: null,
      unapplied_hints: [],
    });
  });

  it("reports the language the model could not serve", () => {
    const flagged = JSON.stringify({ ...PLAN, unsupported_language: "Thai" });
    expect(endpointVariantPlanService.planInfoOf(endpoint({ ai_plan: flagged }))).toEqual({
      unsupported_language: "Thai",
      unapplied_hints: [],
    });
  });

  // A verdict belongs to the body it was reached on. Once the inputs move, the endpoint list has
  // to say nothing rather than badge a language the new body may not even be written in.
  it("reports nothing once the blueprint has gone stale", () => {
    const flagged = JSON.stringify({ ...PLAN, unsupported_language: "Thai" });
    expect(
      endpointVariantPlanService.planInfoOf(
        endpoint({ ai_plan: flagged, ai_plan_hash: "no-longer-matching" })
      )
    ).toBeUndefined();
  });
});
