jest.mock("@/server/services/endpoint_group.service", () => ({
  __esModule: true,
  default: {
    checkPermission: jest.fn(),
    getEndpointGroupById: jest.fn(),
    updateEndpointGroupById: jest.fn(),
    deleteEndpointGroupById: jest.fn(),
  },
}));

import endpointGroupService from "@/server/services/endpoint_group.service";
import { GET, PUT, DELETE } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import IdConverter from "@/app/libs/helpers/idConverter";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

describe("src/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/route.ts", () => {
  const props = (projectId: string, endpointGroupId: string) => ({
    params: Promise.resolve({ projectId, endpointGroupId }),
  });

  it("returns 403 when permission denied", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(false);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
      props(IdConverter.encode(1n), IdConverter.encode(10n)) as any
    );
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
  });

  it("GET returns 404 when endpoint group not found", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (endpointGroupService.getEndpointGroupById as jest.Mock).mockResolvedValue(null);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
      props(IdConverter.encode(1n), IdConverter.encode(10n)) as any
    );
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("PUT returns 200 when updated", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (endpointGroupService.updateEndpointGroupById as jest.Mock).mockResolvedValue({
      id: 10n,
      project_id: 1n,
      name: "New",
    });
    const res = await PUT(
      createJsonRequest({ name: "New" }, { headers: { "x-userId": "1" } }) as any,
      props(IdConverter.encode(1n), IdConverter.encode(10n)) as any
    );
    await expectSuccess(res, 200);
  });

  it("DELETE returns 204 when service returns falsy", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (endpointGroupService.deleteEndpointGroupById as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      createJsonRequest({}, { headers: { "x-userId": "1" } }) as any,
      props(IdConverter.encode(1n), IdConverter.encode(10n)) as any
    );
    expect(res.status).toBe(204);
  });
});

