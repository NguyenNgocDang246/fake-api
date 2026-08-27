import { createJsonRequest, expectError, expectSuccess, readJson } from "../../helpers/http";
import { LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import {
  EndpointService,
  aiUsageService,
  endpointVariantPlanService,
  PUT,
  afterQueue,
  USER_PUBLIC_ID,
  PROJECT_PUBLIC_ID,
  GROUP_PUBLIC_ID,
  ENDPOINT_PUBLIC_ID,
  props,
} from "./endpoint_by_id_harness";

describe("PUT invalidates the blueprint", () => {
  const AI_ROW = {
    public_id: ENDPOINT_PUBLIC_ID,
    path: "/x",
    method: "GET" as const,
    status_code: 200,
    delay_ms: 0,
    id: 1n,
    response_body: '{"name":"An"}',
    ai_enabled: true,
    ai_fields: ["name"],
    ai_prompt: null,
    ai_plan: null,
    ai_plan_hash: null,
  };

  async function put(updated: object, body: object, stale: boolean) {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.updateEndpointById as jest.Mock).mockResolvedValue(updated);
    (endpointVariantPlanService.isPlanStale as jest.Mock).mockReturnValue(stale);

    const res = await PUT(
      createJsonRequest(
        { method: "GET", path: "/x", status_code: 200, delay_ms: 0, ...body },
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
    await afterQueue.__flushAfter();
    return res;
  }

  it("clears the blueprint and builds a new one when it went stale", async () => {
    const updated = { ...AI_ROW, response_body: '{"name":"Binh"}' };
    await put(updated, { response_body: '{"name":"Binh"}', ai_enabled: true, ai_fields: ["name"] }, true);

    expect(endpointVariantPlanService.clearPlan).toHaveBeenCalledWith(1n);
    expect(endpointVariantPlanService.ensurePlan).toHaveBeenCalledWith(updated);
  });

  it("does nothing when the stored blueprint still describes the endpoint", async () => {
    await put(AI_ROW, { response_body: '{"name":"An"}', ai_enabled: true, ai_fields: ["name"] }, false);

    expect(endpointVariantPlanService.clearPlan).not.toHaveBeenCalled();
    expect(afterQueue.__afterCount()).toBe(0);
  });

  // `isPlanStale` answers true for any endpoint not serving variants, so asking it alone threw
  // a perfectly good blueprint away on the edit that unticks Enable, and ticking it back on
  // then cost a model call out of the daily quota.
  it("keeps the blueprint when the edit only switches AI off", async () => {
    const updated = { ...AI_ROW, ai_enabled: false, ai_fields: [] };
    await put(updated, { response_body: '{"name":"An"}', ai_enabled: false, ai_fields: [] }, true);

    expect(endpointVariantPlanService.clearPlan).not.toHaveBeenCalled();
    expect(endpointVariantPlanService.ensurePlan).not.toHaveBeenCalled();
    expect(afterQueue.__afterCount()).toBe(0);
  });

  it("reuses that blueprint when AI is switched back on with nothing else changed", async () => {
    await put(AI_ROW, { response_body: '{"name":"An"}', ai_enabled: true, ai_fields: ["name"] }, false);

    expect(endpointVariantPlanService.clearPlan).not.toHaveBeenCalled();
    expect(endpointVariantPlanService.ensurePlan).not.toHaveBeenCalled();
  });

  it("asks staleness of the updated row, not of the request body", async () => {
    const updated = { ...AI_ROW, ai_fields: ["name", "age"] };
    await put(updated, { response_body: '{"name":"An"}', ai_enabled: true, ai_fields: ["name"] }, true);

    expect(endpointVariantPlanService.isPlanStale).toHaveBeenCalledWith(updated);
  });

  // The flag the update form reads to decide whether a reroll can be free. The blueprint itself
  // never travels, so this boolean is the client's only way to know one exists.
  it("reports ai_has_plan from the stored blueprint's verdict", async () => {
    (endpointVariantPlanService.planInfoOf as jest.Mock).mockReturnValue({
      unsupported_language: null,
      unapplied_hints: [],
    });

    const res = await put(AI_ROW, { response_body: '{"name":"An"}', ai_enabled: true, ai_fields: ["name"] }, false);
    const json = (await readJson(res)) as { data: { ai_has_plan: boolean } };

    expect(json.data.ai_has_plan).toBe(true);
  });

  it("reports ai_has_plan false while the endpoint has no usable blueprint", async () => {
    (endpointVariantPlanService.planInfoOf as jest.Mock).mockReturnValue(undefined);

    const updated = { ...AI_ROW, response_body: '{"name":"Binh"}' };
    const res = await put(updated, { response_body: '{"name":"Binh"}', ai_enabled: true, ai_fields: ["name"] }, true);
    const json = (await readJson(res)) as { data: { ai_has_plan: boolean } };

    expect(json.data.ai_has_plan).toBe(false);
  });

  it("refuses ai_enabled for a role with no AI, before it writes anything", async () => {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(false);

    const res = await PUT(
      createJsonRequest(
        {
          method: "GET",
          path: "/x",
          status_code: 200,
          delay_ms: 0,
          response_body: '{"name":"An"}',
          ai_enabled: true,
          ai_fields: ["name"],
        },
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );

    await expectError(res, STATUS_CODE.FORBIDDEN, LIMIT_MESSAGES.AI_NOT_AVAILABLE_FOR_ROLE);
    expect(EndpointService.updateEndpointById).not.toHaveBeenCalled();
  });

  // Otherwise a role that loses AI can no longer save the endpoint at all, not even to
  // switch the flag it is being refused for back off.
  it("still lets that role save the endpoint with ai_enabled off", async () => {
    (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(false);
    const updated = { ...AI_ROW, ai_enabled: false, ai_fields: [] };

    await put(updated, { response_body: '{"name":"An"}', ai_enabled: false, ai_fields: [] }, false);

    expect(EndpointService.updateEndpointById).toHaveBeenCalled();
  });

  it("swallows a cleanup failure rather than rejecting after the response", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    (endpointVariantPlanService.clearPlan as jest.Mock).mockRejectedValue(new Error("db down"));

    await expect(
      put(
        { ...AI_ROW, response_body: '{"name":"Binh"}' },
        { response_body: '{"name":"Binh"}', ai_enabled: true, ai_fields: ["name"] },
        true
      )
    ).resolves.toBeDefined();

    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
