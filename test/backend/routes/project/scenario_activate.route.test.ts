jest.mock("@/server/services/endpoint/endpoint.service", () => ({
  __esModule: true,
  default: { getEndpointById: jest.fn() },
}));

jest.mock("@/server/services/endpoint/scenario.service", () => ({
  __esModule: true,
  default: { checkPermission: jest.fn(), setActiveScenario: jest.fn() },
}));

jest.mock("@/server/services/endpoint/variant/plan.service", () => ({
  __esModule: true,
  default: { planInfoOf: jest.fn() },
}));

import endpointService from "@/server/services/endpoint/endpoint.service";
import scenarioService from "@/server/services/endpoint/scenario.service";
import { POST } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/[endpointId]/scenario/[scenarioId]/activate/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess, readJson } from "../../helpers/http";
import { ENDPOINT_PUBLIC_ID, SCENARIO_PUBLIC_ID, endpointRow, scenarioRow } from "./endpoint_fixture";

const USER_PUBLIC_ID = "aaaaaaaaaaaa";
const PROJECT_PUBLIC_ID = "bbbbbbbbbbbb";
const GROUP_PUBLIC_ID = "cccccccccccc";
const OTHER_SCENARIO_PUBLIC_ID = "ffffffffffff";

const props = (scenarioId = SCENARIO_PUBLIC_ID) => ({
  params: Promise.resolve({
    projectId: PROJECT_PUBLIC_ID,
    endpointGroupId: GROUP_PUBLIC_ID,
    endpointId: ENDPOINT_PUBLIC_ID,
    scenarioId,
  }),
});

const request = () => createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } });

describe("scenario activate route: POST", () => {
  beforeEach(() => {
    (scenarioService.checkPermission as jest.Mock).mockResolvedValue(true);
    (scenarioService.setActiveScenario as jest.Mock).mockResolvedValue({ id: 1n });
  });

  it("returns 403 when the scenario is not the caller's", async () => {
    (scenarioService.checkPermission as jest.Mock).mockResolvedValue(false);
    const res = await POST(request(), props());
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
    expect(scenarioService.setActiveScenario).not.toHaveBeenCalled();
  });

  it("returns 404 when the scenario is gone", async () => {
    (scenarioService.setActiveScenario as jest.Mock).mockResolvedValue(null);
    const res = await POST(request(), props());
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("returns 400 when the scenario id is not a public id", async () => {
    const res = await POST(request(), props("no"));
    await expectError(res, STATUS_CODE.BAD_REQUEST);
    expect(scenarioService.setActiveScenario).not.toHaveBeenCalled();
  });

  // The row that asked draws itself from this answer rather than refetching the whole list, so
  // every scenario comes back and the count is the endpoint's own.
  it("answers with the whole endpoint, the switched scenario marked active", async () => {
    (endpointService.getEndpointById as jest.Mock).mockResolvedValue(
      endpointRow({
        scenarios: [
          scenarioRow({ is_active: false }),
          scenarioRow({
            id: 2n,
            public_id: OTHER_SCENARIO_PUBLIC_ID,
            name: "Not found",
            position: 1,
            is_active: true,
            status_code: 404,
          }),
        ],
      })
    );

    const res = await POST(request(), props(OTHER_SCENARIO_PUBLIC_ID));

    await expectSuccess(res, 200);
    expect(scenarioService.setActiveScenario).toHaveBeenCalledWith({
      public_id: OTHER_SCENARIO_PUBLIC_ID,
    });
    const body = await readJson(res);
    expect(body.data.scenarios).toHaveLength(2);
    expect(body.data.scenario_count).toBe(2);
    expect(body.data.scenarios[1]).toMatchObject({
      public_id: OTHER_SCENARIO_PUBLIC_ID,
      is_active: true,
    });
  });
});
