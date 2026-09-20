import { createJsonRequest, expectError, expectSuccess, readJson } from "../../helpers/http";
import { LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import {
  EndpointService,
  scenarioService,
  aiUsageService,
  endpointVariantPlanService,
  PUT,
  afterQueue,
  USER_PUBLIC_ID,
  PROJECT_PUBLIC_ID,
  GROUP_PUBLIC_ID,
  ENDPOINT_PUBLIC_ID,
  SCENARIO_PUBLIC_ID,
  endpointRow,
  scenarioRow,
  updateResult,
  writeBody,
  props,
} from "./endpoint_by_id_harness";

describe("PUT settles a blueprint per scenario", () => {
  const AI_STORED = scenarioRow({
    response_body: '{"name":"An"}',
    ai_enabled: true,
    ai_fields: ["name"],
    ai_plan: "{}",
    ai_plan_hash: "h",
  });

  const aiPage = (overrides: Record<string, unknown> = {}) => ({
    public_id: SCENARIO_PUBLIC_ID,
    response_body: '{"name":"An"}',
    ai_enabled: true,
    ai_fields: ["name"],
    ...overrides,
  });

  // `getScenariosOfEndpoint` is asked twice: once before the write, for the selection and hint
  // each stored blueprint was designed under, and once after, for what the settle runs against.
  async function put({
    before = [AI_STORED],
    written = [AI_STORED],
    pages = [aiPage()],
  }: {
    before?: Record<string, unknown>[];
    written?: Record<string, unknown>[];
    pages?: Record<string, unknown>[];
  } = {}) {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.updateEndpointById as jest.Mock).mockResolvedValue(updateResult());
    // Reset first: `clearMocks` wipes the recorded calls but keeps a queued `once` value, and a
    // test that returns before the second lookup would hand its leftover to the next one.
    (scenarioService.getScenariosOfEndpoint as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce(before)
      .mockResolvedValue(written);

    const res = await PUT(
      createJsonRequest(writeBody(pages), { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    return res;
  }

  const PLAN = {
    version: 1 as const,
    locale: "en" as const,
    entities: [],
    catalogs: [],
    unapplied_hints: [],
    fields: [{ path: "name", recipe: { kind: "semantic" as const, name: "full_name" as const } }],
  };

  it("adopts a blueprint the form previewed rather than paying for another", async () => {
    (endpointVariantPlanService.adoptPlan as jest.Mock).mockResolvedValue(true);

    const res = await put({ pages: [aiPage({ plan: PLAN, plan_hash: "h" })] });
    await expectSuccess(res, 200);
    await afterQueue.__flushAfter();

    expect(endpointVariantPlanService.adoptPlan).toHaveBeenCalled();
    expect(endpointVariantPlanService.carryPlanForward).not.toHaveBeenCalled();
    expect(endpointVariantPlanService.ensurePlan).not.toHaveBeenCalled();
  });

  // The hash moves on any body edit, including ones the blueprint survives, so it is offered the
  // new body before anything is cleared. Clearing first would have destroyed it either way.
  it("carries a surviving blueprint forward, under the origin the row held before the write", async () => {
    (endpointVariantPlanService.carryPlanForward as jest.Mock).mockResolvedValue(true);

    await put({ pages: [aiPage({ response_body: '{"name":"Binh"}' })] });
    await afterQueue.__flushAfter();

    expect(endpointVariantPlanService.carryPlanForward).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1n }),
      { ai_fields: AI_STORED.ai_fields, ai_prompt: AI_STORED.ai_prompt }
    );
    expect(endpointVariantPlanService.clearPlan).not.toHaveBeenCalled();
    expect(endpointVariantPlanService.ensurePlan).not.toHaveBeenCalled();
  });

  // Clearing drops the build lock too, so an edit ends the retry cooldown: fixing a broken body
  // must not leave the scenario frozen for another AI_PLAN_LOCK_MS serving its base body.
  it("clears the dead blueprint and builds a new one when nothing survived", async () => {
    await put({ pages: [aiPage({ response_body: '{"name":"Binh"}' })] });
    await afterQueue.__flushAfter();

    expect(endpointVariantPlanService.clearPlan).toHaveBeenCalledWith(1n);
    expect(endpointVariantPlanService.ensurePlan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1n })
    );
  });

  it("clears nothing for a scenario the author has only just added", async () => {
    await put({
      before: [],
      written: [scenarioRow({ ai_enabled: true, ai_fields: ["name"] })],
      pages: [aiPage({ public_id: null })],
    });
    await afterQueue.__flushAfter();

    expect(endpointVariantPlanService.carryPlanForward).not.toHaveBeenCalled();
    expect(endpointVariantPlanService.clearPlan).not.toHaveBeenCalled();
    expect(endpointVariantPlanService.ensurePlan).toHaveBeenCalled();
  });

  // N model calls on one save is minutes of work and N quota burns for pages nobody may open.
  // The rest build on their own first request, which the fake route already handles.
  it("designs only the active scenario, leaving the other pages to their first request", async () => {
    const second = scenarioRow({
      id: 2n,
      public_id: "ffffffffffff",
      position: 1,
      is_active: false,
      ai_enabled: true,
      ai_fields: ["name"],
    });

    await put({
      before: [],
      written: [scenarioRow({ ai_enabled: true, ai_fields: ["name"] }), second],
      pages: [aiPage({ public_id: null }), aiPage({ public_id: null })],
    });
    await afterQueue.__flushAfter();

    expect(endpointVariantPlanService.ensurePlan).toHaveBeenCalledTimes(1);
    expect(endpointVariantPlanService.ensurePlan).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1n })
    );
  });

  it("leaves a scenario that is not varying anything alone", async () => {
    await put({ before: [], written: [scenarioRow()], pages: [{ public_id: null }] });
    await afterQueue.__flushAfter();

    expect(endpointVariantPlanService.ensurePlan).not.toHaveBeenCalled();
  });

  it("reports ai_has_plan from the stored blueprint's verdict", async () => {
    (endpointVariantPlanService.planInfoOf as jest.Mock).mockReturnValue({
      unsupported_language: null,
      unapplied_hints: [],
    });

    const res = await put();
    const body = await readJson<{ data: { scenarios: { ai_has_plan: boolean }[] } }>(res);

    expect(body.data.scenarios[0]?.ai_has_plan).toBe(true);
  });

  it("reports ai_has_plan false while the scenario has no usable blueprint", async () => {
    (endpointVariantPlanService.planInfoOf as jest.Mock).mockReturnValue(undefined);

    const res = await put();
    const body = await readJson<{ data: { scenarios: { ai_has_plan: boolean }[] } }>(res);

    expect(body.data.scenarios[0]?.ai_has_plan).toBe(false);
  });

  it("refuses ai_enabled for a role with no AI, before it writes anything", async () => {
    (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(false);

    const res = await put();

    await expectError(
      res,
      STATUS_CODE.FORBIDDEN,
      LIMIT_MESSAGES.AI_NOT_AVAILABLE_FOR_ROLE
    );
    expect(EndpointService.updateEndpointById).not.toHaveBeenCalled();
  });

  it("still lets that role save the endpoint with AI off everywhere", async () => {
    (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(false);

    const res = await put({ before: [], written: [scenarioRow()], pages: [{ public_id: null }] });

    await expectSuccess(res, 200);
  });

  // A save carrying three designs must not be let through on room for one. Counting a single
  // design is what would leave the other pages answering with the base body and saying nothing.
  it("refuses when the quota has no room for every scenario that needs a design", async () => {
    (endpointVariantPlanService.wouldDesign as jest.Mock).mockReturnValue(true);
    (aiUsageService.quotaFor as jest.Mock).mockResolvedValue({ limit: 30, spent: 29 });

    const res = await put({
      before: [],
      pages: [aiPage({ public_id: null }), aiPage({ public_id: null })],
    });

    await expectError(
      res,
      STATUS_CODE.FORBIDDEN,
      LIMIT_MESSAGES.AI_PLAN_LIMIT_REACHED_ON_SAVE
    );
    expect(EndpointService.updateEndpointById).not.toHaveBeenCalled();
  });

  it("lets the same save through when the quota has room for all of them", async () => {
    (endpointVariantPlanService.wouldDesign as jest.Mock).mockReturnValue(true);
    (aiUsageService.quotaFor as jest.Mock).mockResolvedValue({ limit: 30, spent: 28 });

    const res = await put({
      before: [],
      written: [scenarioRow({ ai_enabled: true, ai_fields: ["name"] })],
      pages: [aiPage({ public_id: null }), aiPage({ public_id: null })],
    });

    await expectSuccess(res, 200);
  });

  it("refuses more scenarios than the role is allowed to hold", async () => {
    (scenarioService.canHoldScenarios as jest.Mock).mockResolvedValue(false);

    const res = await put();

    await expectError(res, STATUS_CODE.FORBIDDEN, LIMIT_MESSAGES.SCENARIO_LIMIT_REACHED);
    expect(EndpointService.updateEndpointById).not.toHaveBeenCalled();
  });

  it("answers with every scenario, so the pager can redraw from the response", async () => {
    const res = await put({
      before: [],
      written: [scenarioRow(), scenarioRow({ id: 2n, public_id: "ffffffffffff", position: 1 })],
      pages: [{ public_id: null }, { public_id: null }],
    });

    const body = await readJson<{ data: { scenarios: unknown[] } }>(res);
    expect(body.data.scenarios).toHaveLength(2);
  });

  it("leaves the endpoint row untouched when the lookup says it is gone", async () => {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.updateEndpointById as jest.Mock).mockResolvedValue(null);
    (scenarioService.getScenariosOfEndpoint as jest.Mock).mockResolvedValue([]);

    const res = await PUT(
      createJsonRequest(writeBody(), { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );

    expect(res.status).toBe(STATUS_CODE.NO_CONTENT);
  });

  it("keeps the endpoint's own address on the row it hands the blueprint layer", async () => {
    (EndpointService.getEndpointById as jest.Mock).mockResolvedValue(endpointRow());

    await put({ before: [], pages: [aiPage({ public_id: null })] });
    await afterQueue.__flushAfter();

    expect(endpointVariantPlanService.ensurePlan).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET", path: "/x" })
    );
  });

  it("names the endpoint it edited, not another row", async () => {
    const res = await put();
    const body = await readJson<{ data: { public_id: string } }>(res);

    expect(body.data.public_id).toBe(ENDPOINT_PUBLIC_ID);
  });
});
