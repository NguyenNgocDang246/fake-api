jest.mock("@/server/services/endpoint.service", () => ({
  __esModule: true,
  default: {
    checkPermissions: jest.fn(),
    getEndpointById: jest.fn(),
    updateEndpointById: jest.fn(),
    deleteEndpointById: jest.fn(),
  },
}));

import EndpointService from "@/server/services/endpoint.service";
import { GET, PUT, DELETE } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/[endpointId]/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import IdConverter from "@/app/libs/helpers/idConverter";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

describe("src/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/[endpointId]/route.ts", () => {
  const props = (projectId: string, endpointGroupId: string, endpointId: string) => ({
    params: Promise.resolve({ projectId, endpointGroupId, endpointId }),
  });

  it("GET returns 403 when permission denied", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(false);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
      props(IdConverter.encode(1n), IdConverter.encode(10n), IdConverter.encode(100n)) as any
    );
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
  });

  it("GET returns 404 when endpoint missing", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointById as jest.Mock).mockResolvedValue(null);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
      props(IdConverter.encode(1n), IdConverter.encode(10n), IdConverter.encode(100n)) as any
    );
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("GET returns 403 when endpoint_groups_id mismatch", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointById as jest.Mock).mockResolvedValue({
      id: 100n,
      endpoint_groups_id: 11n,
      path: "/x",
      method: "GET",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
      props(IdConverter.encode(1n), IdConverter.encode(10n), IdConverter.encode(100n)) as any
    );
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
  });

  it("PUT returns 200 when updated", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (EndpointService.updateEndpointById as jest.Mock).mockResolvedValue({
      id: 100n,
      endpoint_groups_id: 10n,
      path: "/x",
      method: "GET",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await PUT(
      createJsonRequest(
        { method: "GET", path: "/x", status_code: 200, response_body: "{}", delay_ms: 0 },
        { headers: { "x-userId": "1" } }
      ) as any,
      props(IdConverter.encode(1n), IdConverter.encode(10n), IdConverter.encode(100n)) as any
    );
    await expectSuccess(res, 200);
  });

  it("DELETE returns 204 when service returns falsy", async () => {
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
    (EndpointService.deleteEndpointById as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
      props(IdConverter.encode(1n), IdConverter.encode(10n), IdConverter.encode(100n)) as any
    );
    expect(res.status).toBe(204);
  });
});

