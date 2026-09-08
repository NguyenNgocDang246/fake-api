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

jest.mock("@/server/services/endpoint/variant/plan.service", () => ({
  __esModule: true,
  default: { ensurePlan: jest.fn(), planInfoOf: jest.fn(), wouldDesign: jest.fn() },
}));
jest.mock("@/server/services/endpoint_group.service", () => ({
  __esModule: true,
  default: { checkPermission: jest.fn() },
}));
jest.mock("@/server/services/ai_usage.service", () => ({
  __esModule: true,
  default: { isAiAllowed: jest.fn(), quotaFor: jest.fn() },
}));

import EndpointService from "@/server/services/endpoint/endpoint.service";
import endpointGroupService from "@/server/services/endpoint_group.service";
import aiUsageService from "@/server/services/ai_usage.service";
import endpointVariantPlanService from "@/server/services/endpoint/variant/plan.service";
import { GET, POST, DELETE } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/route";
import { ERROR_MESSAGES, LIMIT_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { ENDPOINT_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

const USER_PUBLIC_ID = "aaaaaaaaaaaa";
const PROJECT_PUBLIC_ID = "bbbbbbbbbbbb";
const GROUP_PUBLIC_ID = "cccccccccccc";
const ENDPOINT_PUBLIC_ID = "dddddddddddd";

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

  it("GET returns 400 when response_body is not an object (validation)", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getAllEndpoints as jest.Mock).mockResolvedValue([
      {
        public_id: ENDPOINT_PUBLIC_ID,
        path: "/x",
        method: "GET",
        status_code: 200,
        response_body: "not-an-object",
        delay_ms: 0,
      },
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
        {
          method: "GET",
          path: "/x",
          status_code: 200,
          response_body: "{}",
          delay_ms: 0,
        },
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
        {
          method: "GET",
          path: "/x",
          status_code: 200,
          response_body: "[]",
          delay_ms: 0,
        },
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
        {
          method: "GET",
          path: "/x",
          status_code: 200,
          response_body: '{"name":"An"}',
          delay_ms: 0,
          ai_enabled: true,
          ai_fields: ["name"],
        },
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
        {
          method: "GET",
          path: "/x",
          status_code: 200,
          response_body: '{"name":"An"}',
          delay_ms: 0,
          ai_enabled: true,
          ai_fields: ["name"],
        },
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
    (EndpointService.createEndpoint as jest.Mock).mockResolvedValue({
      public_id: ENDPOINT_PUBLIC_ID,
      path: "/x",
      method: "GET",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
      ai_enabled: false,
      ai_fields: [],
      ai_prompt: null,
    });

    const res = await POST(
      createJsonRequest(
        { method: "GET", path: "/x", status_code: 200, response_body: "{}", delay_ms: 0 },
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
