import {
  endpointVariantPlanService,
  planHash,
  prisma,
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

// What the write routes refuse a save on, so an edit that moves the hash cannot clear a working
// blueprint and then fail to replace it on a spent quota.
describe("wouldDesign", () => {
  const matchingHash = planHash({ responseBody: BODY, aiFields: FIELDS, aiPrompt: null });
  // The selection and hint the stored blueprint was designed under.
  const ORIGIN = { ai_fields: FIELDS, ai_prompt: null };

  it("says no while the stored blueprint still describes the inputs", () => {
    expect(endpointVariantPlanService.wouldDesign(endpoint(), null, null, ORIGIN)).toBe(false);
  });

  // The hash moves on any edit, but a design is only owed when the edit actually broke the
  // blueprint. `items[].price` is not ticked and nothing in the blueprint reads it.
  it("says no when the edit cannot touch the blueprint, even though the hash moved", () => {
    const edited = endpoint({ response_body: '{"name":"An","age":3,"items":[{"price":2}]}' });

    expect(endpointVariantPlanService.isPlanStale(edited)).toBe(true);
    expect(endpointVariantPlanService.wouldDesign(edited, null, null, ORIGIN)).toBe(false);
  });

  it("says yes when the edit breaks the blueprint", () => {
    // `age` holds a string now, and the blueprint promises an int for it.
    const broken = endpoint({ response_body: '{"name":"An","age":"three","items":[{"price":1}]}' });

    expect(endpointVariantPlanService.wouldDesign(broken, null, null, ORIGIN)).toBe(true);
  });

  it("says yes when a ticked field leaves the body altogether", () => {
    const gone = endpoint({ response_body: '{"name":"An","items":[{"price":1}]}' });

    expect(endpointVariantPlanService.wouldDesign(gone, null, null, ORIGIN)).toBe(true);
  });

  // `validatePlan` cannot see this one: every recipe is still allowed and still type-fits, so a
  // ticked field would have carried a blueprint forward that varies nothing new.
  it("says yes when a field is ticked, which no stored blueprint can cover", () => {
    const ticked = endpoint({ ai_fields: [...FIELDS, "items[].price"] });

    expect(endpointVariantPlanService.wouldDesign(ticked, null, null, ORIGIN)).toBe(true);
  });

  it("says yes when a field is unticked", () => {
    expect(
      endpointVariantPlanService.wouldDesign(endpoint({ ai_fields: ["name"] }), null, null, ORIGIN)
    ).toBe(true);
  });

  // Nothing in a blueprint records the hint, so a changed one is invisible to validation and
  // would otherwise be silently ignored by the design already stored.
  it("says yes when the hint changes", () => {
    const hinted = endpoint({ ai_prompt: "use a uuid for id" });

    expect(endpointVariantPlanService.wouldDesign(hinted, null, null, ORIGIN)).toBe(true);
  });

  it("does not count a reordered selection or a respaced hint as a change", () => {
    const same = endpoint({ ai_fields: ["age", "name"], ai_prompt: "  " });

    expect(endpointVariantPlanService.wouldDesign(same, null, null, ORIGIN)).toBe(false);
  });

  it("says yes for a create, which stores no blueprint yet", () => {
    expect(
      endpointVariantPlanService.wouldDesign(
        endpoint({ ai_plan: null, ai_plan_hash: null }),
        null,
        null,
        null
      )
    ).toBe(true);
  });

  // The blueprint a preview handed the client costs nothing to store, so a save carrying one is
  // not a design and must go through even on an empty allowance.
  it("says no when the blueprint travelling with the save can be adopted", () => {
    const fresh = endpoint({ ai_plan: null, ai_plan_hash: null });

    expect(endpointVariantPlanService.wouldDesign(fresh, PLAN, matchingHash, null)).toBe(false);
  });

  it("says yes when that blueprint was built for different inputs", () => {
    const fresh = endpoint({ ai_plan: null, ai_plan_hash: null });

    expect(
      endpointVariantPlanService.wouldDesign(fresh, PLAN, "built-for-something-else", null)
    ).toBe(true);
  });

  it("says yes when that blueprint no longer fits the body", () => {
    const body = '{"name":"An","age":"three","items":[{"price":1}]}';
    const fresh = endpoint({ response_body: body, ai_plan: null, ai_plan_hash: null });
    const hash = planHash({ responseBody: body, aiFields: FIELDS, aiPrompt: null });

    // `age` holds a string now, and the blueprint promises an int for it.
    expect(endpointVariantPlanService.wouldDesign(fresh, PLAN, hash, null)).toBe(true);
  });

  it("says yes for a stored blueprint that will not parse", () => {
    const broken = endpoint({ ai_plan: "{not json", ai_plan_hash: "moved" });

    expect(endpointVariantPlanService.wouldDesign(broken, null, null, ORIGIN)).toBe(true);
  });

  // The escape hatch from a refused save: switching AI off never needs a design, so it saves.
  it("says no when AI is off or nothing is selected", () => {
    const edited = { response_body: '{"name":"Binh"}', ai_plan: null, ai_plan_hash: null };

    expect(
      endpointVariantPlanService.wouldDesign(
        endpoint({ ...edited, ai_enabled: false }),
        null,
        null,
        ORIGIN
      )
    ).toBe(false);
    expect(
      endpointVariantPlanService.wouldDesign(
        endpoint({ ...edited, ai_fields: [] }),
        null,
        null,
        ORIGIN
      )
    ).toBe(false);
  });
});

describe("carryPlanForward", () => {
  const ORIGIN = { ai_fields: FIELDS, ai_prompt: null };

  it("re-stores the blueprint under the hash of the body it survived", async () => {
    const body = '{"name":"An","age":3,"items":[{"price":2}]}';
    const edited = endpoint({ response_body: body });

    await expect(endpointVariantPlanService.carryPlanForward(edited, ORIGIN)).resolves.toBe(true);

    // Stamped with the edited body's hash, so the row stops reading as stale.
    const [, , storedHash] = (prisma.$executeRaw as jest.Mock).mock.calls[0] as unknown[];
    expect(storedHash).toBe(planHash({ responseBody: body, aiFields: FIELDS, aiPrompt: null }));
  });

  it("refuses when the edit broke the blueprint, leaving the row for a redesign", async () => {
    const broken = endpoint({ response_body: '{"name":"An","age":"three","items":[{"price":1}]}' });

    await expect(endpointVariantPlanService.carryPlanForward(broken, ORIGIN)).resolves.toBe(false);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("refuses a changed selection or hint, which no blueprint carries through", async () => {
    const ticked = endpoint({ ai_fields: [...FIELDS, "items[].price"] });
    const hinted = endpoint({ ai_prompt: "use a uuid for id" });

    await expect(endpointVariantPlanService.carryPlanForward(ticked, ORIGIN)).resolves.toBe(false);
    await expect(endpointVariantPlanService.carryPlanForward(hinted, ORIGIN)).resolves.toBe(false);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("refuses when there is no blueprint to carry", async () => {
    await expect(
      endpointVariantPlanService.carryPlanForward(endpoint({ ai_plan: null }), ORIGIN)
    ).resolves.toBe(false);
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
