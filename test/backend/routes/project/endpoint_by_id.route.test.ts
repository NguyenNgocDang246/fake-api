jest.mock("@/server/services/endpoint.service", () => ({
  __esModule: true,
  default: {
    checkPermissions: jest.fn(),
    getEndpointById: jest.fn(),
    getEndpointByPath: jest.fn(),
    updateEndpointById: jest.fn(),
    deleteEndpointById: jest.fn(),
  },
}));

import EndpointService from "@/server/services/endpoint.service";
import { GET, PUT, DELETE } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/[endpointId]/route";
import { ENDPOINT_MESSAGES, ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

const USER_PUBLIC_ID = "aaaaaaaaaaaa";
const PROJECT_PUBLIC_ID = "bbbbbbbbbbbb";
const GROUP_PUBLIC_ID = "cccccccccccc";
const ENDPOINT_PUBLIC_ID = "dddddddddddd";

describe("src/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/[endpointId]/route.ts", () => {
  const props = (projectId: string, endpointGroupId: string, endpointId: string) => ({
    params: Promise.resolve({ projectId, endpointGroupId, endpointId }),
  });

  it("GET returns 403 when permission denied", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(false);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
  });

  it("GET returns 404 when endpoint missing", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointById as jest.Mock).mockResolvedValue(null);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("GET returns 200 when endpoint found", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointById as jest.Mock).mockResolvedValue({
      public_id: ENDPOINT_PUBLIC_ID,
      path: "/x",
      method: "GET",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
  });

  it("PUT returns 200 when updated", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.updateEndpointById as jest.Mock).mockResolvedValue({
      public_id: ENDPOINT_PUBLIC_ID,
      path: "/x",
      method: "GET",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await PUT(
      createJsonRequest(
        { method: "GET", path: "/x", status_code: 200, response_body: "{}", delay_ms: 0 },
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
  });

  it("PUT returns 200 when path unchanged (matches its own record)", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      public_id: ENDPOINT_PUBLIC_ID,
    });
    (EndpointService.updateEndpointById as jest.Mock).mockResolvedValue({
      public_id: ENDPOINT_PUBLIC_ID,
      path: "/x",
      method: "GET",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await PUT(
      createJsonRequest(
        { method: "GET", path: "/x", status_code: 200, response_body: "{}", delay_ms: 0 },
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
  });

  it("PUT returns 409 when new path/method collides with another endpoint", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      public_id: "other_endpoint",
    });
    const res = await PUT(
      createJsonRequest(
        { method: "GET", path: "/x", status_code: 200, response_body: "{}", delay_ms: 0 },
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.CONFLICT, ENDPOINT_MESSAGES.ENDPOINT_DUPLICATED);
    expect(EndpointService.updateEndpointById).not.toHaveBeenCalled();
  });

  it("DELETE returns 204 when service returns falsy", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (EndpointService.deleteEndpointById as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    expect(res.status).toBe(204);
  });
});
