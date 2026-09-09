import { expectSuccess } from "../../helpers/http";
import {
  USER_PUBLIC_ID,
  ENDPOINT_PUBLIC_ID,
  aiUsageService,
  buildPlan,
  planHash,
  storedEndpoint,
  VALID_BODY,
  PLAN,
  QUOTA,
  post,
  allowAll,
  dataOf,
} from "./ai_preview_harness";

describe("ai-preview route: designing and rerolling", () => {
  it("designs a blueprint and renders samples from it", async () => {
    allowAll();

    const res = await post();
    await expectSuccess(res, 200);

    const data = await dataOf(res);
    expect(data.variants).toHaveLength(3);
    expect(data.plan).toMatchObject({ version: 1 });
    // Each sample is drawn fresh, so the three are not simply the same body repeated.
    expect(new Set(data.variants).size).toBeGreaterThan(1);
    for (const variant of data.variants) {
      expect(typeof (JSON.parse(variant) as { name: unknown }).name).toBe("string");
    }
  });

  // A sample the card shows has to be a body the endpoint would really answer with, so the
  // preview writes back against the author's text exactly as the fake route does.
  it("renders samples that keep every untouched field byte for byte", async () => {
    allowAll();

    const res = await post({
      ...VALID_BODY,
      response_body: '{\n\t"name": "An",\n\t"price": 10.00,\n\t"id": 12345678901234567890\n}',
    });
    await expectSuccess(res, 200);

    for (const variant of (await dataOf(res)).variants) {
      expect(variant).toMatch(
        /^\{"name":"[^"]+","price":10\.00,"id":12345678901234567890\}$/
      );
    }
  });

  it("charges one usage for a design", async () => {
    allowAll();
    await post();

    expect(buildPlan).toHaveBeenCalledTimes(1);
    expect(aiUsageService.trySpend).toHaveBeenCalledWith({ public_id: USER_PUBLIC_ID });
  });

  // What the card's badge reads, so spending a design never leaves it a request behind.
  it("reports the quota the design left behind", async () => {
    allowAll();

    expect((await dataOf(await post())).quota).toEqual(QUOTA);
  });

  it("reports the quota on a free reroll too", async () => {
    allowAll();
    const hash = planHash({ responseBody: '{"name":"An"}', aiFields: ["name"], aiPrompt: null });

    const res = await post({ ...VALID_BODY, plan: PLAN, plan_hash: hash });

    expect((await dataOf(res)).quota).toEqual(QUOTA);
  });

  it("rerolls from a blueprint the caller already holds without a model call", async () => {
    allowAll();
    const hash = planHash({ responseBody: '{"name":"An"}', aiFields: ["name"], aiPrompt: null });

    const res = await post({ ...VALID_BODY, plan: PLAN, plan_hash: hash });
    await expectSuccess(res, 200);

    // The point of the whole design: rerolling is free, so it neither calls a model, nor checks
    // the quota, nor records a usage.
    expect(buildPlan).not.toHaveBeenCalled();
    expect(aiUsageService.trySpend).not.toHaveBeenCalled();
    expect((await dataOf(res)).variants).toHaveLength(3);
  });

  it("redesigns when the caller's blueprint was built for different inputs", async () => {
    allowAll();
    const staleHash = planHash({
      responseBody: '{"name":"An"}',
      aiFields: ["name"],
      aiPrompt: "use a uuid",
    });

    await post({ ...VALID_BODY, plan: PLAN, plan_hash: staleHash });

    expect(buildPlan).toHaveBeenCalledTimes(1);
  });

  it("redesigns when the caller's blueprint no longer fits the body", async () => {
    allowAll();
    const body = { ...VALID_BODY, response_body: '{"name":123}', ai_fields: ["name"] };
    const hash = planHash({
      responseBody: body.response_body,
      aiFields: body.ai_fields,
      aiPrompt: null,
    });

    // The hash matches, but the blueprint promises a string for a field that now holds a
    // number, so validation rejects it and a fresh design is made instead.
    (buildPlan as jest.Mock).mockResolvedValue({
      ...PLAN,
      fields: [{ path: "name", recipe: { kind: "int", min: 1, max: 9 } }],
    });

    await post({ ...body, plan: PLAN, plan_hash: hash });

    expect(buildPlan).toHaveBeenCalledTimes(1);
  });

  // The update form holds no blueprint when it opens, so this is the path that stops reopening an
  // endpoint from paying for the design it already has.
  it("rerolls from the endpoint's own blueprint when the caller only names it", async () => {
    allowAll();
    storedEndpoint(planHash({ responseBody: '{"name":"An"}', aiFields: ["name"], aiPrompt: null }));

    const res = await post({ ...VALID_BODY, endpoint_id: ENDPOINT_PUBLIC_ID });
    await expectSuccess(res, 200);

    expect(buildPlan).not.toHaveBeenCalled();
    expect(aiUsageService.trySpend).not.toHaveBeenCalled();
    expect((await dataOf(res)).variants).toHaveLength(3);
  });

  it("redesigns when the endpoint's blueprint was built for different inputs", async () => {
    allowAll();
    // The saved body, against a request carrying an unsaved edit to it.
    storedEndpoint(planHash({ responseBody: '{"name":"Bo"}', aiFields: ["name"], aiPrompt: null }));

    await post({ ...VALID_BODY, endpoint_id: ENDPOINT_PUBLIC_ID });

    expect(buildPlan).toHaveBeenCalledTimes(1);
  });

  it("redesigns when the endpoint's blueprint no longer fits the body", async () => {
    allowAll();
    const body = { ...VALID_BODY, response_body: '{"name":123}', ai_fields: ["name"] };
    storedEndpoint(
      planHash({ responseBody: body.response_body, aiFields: ["name"], aiPrompt: null })
    );

    (buildPlan as jest.Mock).mockResolvedValue({
      ...PLAN,
      fields: [{ path: "name", recipe: { kind: "int", min: 1, max: 9 } }],
    });

    await post({ ...body, endpoint_id: ENDPOINT_PUBLIC_ID });

    expect(buildPlan).toHaveBeenCalledTimes(1);
  });

  it("ignores a stored blueprint the caller did not ask for", async () => {
    allowAll();
    storedEndpoint(planHash({ responseBody: '{"name":"An"}', aiFields: ["name"], aiPrompt: null }));

    // No `endpoint_id`, so the route never looks the row up: the create form previews the same
    // way whether or not an endpoint elsewhere happens to hold a matching blueprint.
    await post();

    expect(buildPlan).toHaveBeenCalledTimes(1);
  });
});
