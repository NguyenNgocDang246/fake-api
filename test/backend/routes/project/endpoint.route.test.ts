jest.mock("@/server/services/endpoint/endpoint.service", () => ({
  __esModule: true,
  default: {
    getAllEndpoints: jest.fn(),
    getEndpointByPath: jest.fn(),
    createEndpoint: jest.fn(),
    deleteAllEndpoints: jest.fn(),
    canCreateEndpoint: jest.fn(),
  },
}));

jest.mock("@/server/services/endpoint/scenario.service", () => ({
  __esModule: true,
  default: { canHoldScenarios: jest.fn(), getScenariosOfEndpoint: jest.fn() },
}));

jest.mock("@/server/services/endpoint/variant/plan.service", () => ({
  __esModule: true,
  default: {
    ensurePlan: jest.fn(),
    planInfoOf: jest.fn(),
    wouldDesign: jest.fn(),
    adoptPlan: jest.fn(),
    carryPlanForward: jest.fn(),
    clearPlan: jest.fn(),
  },
}));
jest.mock("@/server/services/endpoint_group.service", () => ({
  __esModule: true,
  default: { checkPermission: jest.fn(), endpointGroupExists: jest.fn() },
}));
jest.mock("@/server/services/ai_usage.service", () => ({
  __esModule: true,
  default: { isAiAllowed: jest.fn(), quotaFor: jest.fn() },
}));

import {
  ENDPOINT_PUBLIC_ID,
  endpointRow,
  scenarioRow,
  writeBody,
  writeResult,
} from "./endpoint_fixture";
import EndpointService from "@/server/services/endpoint/endpoint.service";
import scenarioService from "@/server/services/endpoint/scenario.service";
import endpointGroupService from "@/server/services/endpoint_group.service";
import aiUsageService from "@/server/services/ai_usage.service";
import endpointVariantPlanService from "@/server/services/endpoint/variant/plan.service";
import { GET, POST, DELETE } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/route";
import { ERROR_MESSAGES, LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { ENDPOINT_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { createJsonRequest, expectError, expectSuccess, readJson } from "../../helpers/http";

const USER_PUBLIC_ID = "aaaaaaaaaaaa";
const PROJECT_PUBLIC_ID = "bbbbbbbbbbbb";
const GROUP_PUBLIC_ID = "cccccccccccc";

describe("src/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/route.ts", () => {
  const props = (projectId: string, endpointGroupId: string) => ({
    params: Promise.resolve({ projectId, endpointGroupId }),
  });

  // `clearMocks` wipes an implementation set in the factory, and an unset mock answers
  // `undefined`, which the AI guards would read as a refusal on every test.
  beforeEach(() => {
    (EndpointService.canCreateEndpoint as jest.Mock).mockResolvedValue(true);
    (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(true);
    (aiUsageService.quotaFor as jest.Mock).mockResolvedValue({ limit: 30, spent: 0 });
    (endpointVariantPlanService.wouldDesign as jest.Mock).mockReturnValue(false);
    (endpointVariantPlanService.adoptPlan as jest.Mock).mockResolvedValue(false);
    (endpointVariantPlanService.carryPlanForward as jest.Mock).mockResolvedValue(false);
    (scenarioService.canHoldScenarios as jest.Mock).mockResolvedValue(true);
    (scenarioService.getScenariosOfEndpoint as jest.Mock).mockResolvedValue([scenarioRow()]);
    (EndpointService.createEndpoint as jest.Mock).mockResolvedValue(writeResult());
  });

  it("GET returns 204 when list empty", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getAllEndpoints as jest.Mock).mockResolvedValue([]);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    expect(res.status).toBe(204);
  });

  // The list is read through the group's owner, so rows coming back are rows this user may see
  // and nothing else has to be asked.
  it("GET scopes the list to the owner and asks nothing else", async () => {
    (EndpointService.getAllEndpoints as jest.Mock).mockResolvedValue([endpointRow()]);
    await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );

    expect(EndpointService.getAllEndpoints).toHaveBeenCalledWith({
      public_id: GROUP_PUBLIC_ID,
      owner: { user_public_id: USER_PUBLIC_ID, project_public_id: PROJECT_PUBLIC_ID },
    });
    expect(endpointGroupService.checkPermission).not.toHaveBeenCalled();
  });

  // Nothing came back, which a group of somebody else's looks exactly like. Only here is it worth
  // a query to say which of the two it was.
  it("GET returns 403 when the empty answer was somebody else's group", async () => {
    (EndpointService.getAllEndpoints as jest.Mock).mockResolvedValue([]);
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(false);
    (endpointGroupService.endpointGroupExists as jest.Mock).mockResolvedValue(true);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
  });

  it("GET returns 404 when the empty answer was a group that is not there", async () => {
    (EndpointService.getAllEndpoints as jest.Mock).mockResolvedValue([]);
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(false);
    (endpointGroupService.endpointGroupExists as jest.Mock).mockResolvedValue(false);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  // One scenario is shipped and the count says how many there are, which is what tells a row
  // whether it has anything to switch between without the list carrying every body.
  it("GET ships the endpoint's scenario count beside the one scenario it sends", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getAllEndpoints as jest.Mock).mockResolvedValue([
      endpointRow({ _count: { scenarios: 3 } }),
    ]);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );

    await expectSuccess(res, 200);
    const body = await readJson(res);
    expect(body.data[0].scenarios).toHaveLength(1);
    expect(body.data[0].scenario_count).toBe(3);
  });

  it("GET returns 400 when response_body is not an object (validation)", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getAllEndpoints as jest.Mock).mockResolvedValue([
      endpointRow({ scenarios: [scenarioRow({ response_body: "not-an-object" })] }),
    ]);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
  });

  it("POST returns 409 when endpoint duplicated", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      public_id: ENDPOINT_PUBLIC_ID,
    });
    const res = await POST(
      createJsonRequest(
        writeBody([{ response_body: "{}" }]),
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.CONFLICT, ENDPOINT_MESSAGES.ENDPOINT_DUPLICATED);
  });

  it("POST returns 400 for invalid response_body (must be JSON object string)", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    const res = await POST(
      createJsonRequest(
        writeBody([{ response_body: "[]" }]),
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
  });

  it("POST refuses ai_enabled for a role with no AI, before it writes anything", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(false);

    const res = await POST(
      createJsonRequest(
        writeBody([
          { response_body: '{"name":"An"}', ai_enabled: true, ai_fields: ["name"] },
        ]),
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );

    await expectError(res, STATUS_CODE.FORBIDDEN, LIMIT_MESSAGES.AI_NOT_AVAILABLE_FOR_ROLE);
    expect(EndpointService.createEndpoint).not.toHaveBeenCalled();
  });

  // Creating one on a spent allowance would store an AI endpoint whose blueprint never gets
  // built, so it answers with the base body forever and nothing anywhere says why.
  it("POST refuses a create that needs a design when the allowance is spent", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (endpointVariantPlanService.wouldDesign as jest.Mock).mockReturnValue(true);
    (aiUsageService.quotaFor as jest.Mock).mockResolvedValue({ limit: 30, spent: 30 });

    const res = await POST(
      createJsonRequest(
        writeBody([
          { response_body: '{"name":"An"}', ai_enabled: true, ai_fields: ["name"] },
        ]),
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );

    await expectError(res, STATUS_CODE.FORBIDDEN, LIMIT_MESSAGES.AI_PLAN_LIMIT_REACHED_ON_SAVE);
    expect(EndpointService.createEndpoint).not.toHaveBeenCalled();
  });

  it("POST does not ask about AI when the flag is off", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (aiUsageService.isAiAllowed as jest.Mock).mockResolvedValue(false);
    const res = await POST(
      createJsonRequest(
        writeBody(),
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );

    await expectSuccess(res, 200);
    expect(aiUsageService.isAiAllowed).not.toHaveBeenCalled();
  });

  it("DELETE returns 204 when count=0", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.deleteAllEndpoints as jest.Mock).mockResolvedValue({ count: 0 });
    const res = await DELETE(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    expect(res.status).toBe(204);
  });

  it("DELETE returns 200 when deleted", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.deleteAllEndpoints as jest.Mock).mockResolvedValue({ count: 1 });
    const res = await DELETE(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
  });
});
