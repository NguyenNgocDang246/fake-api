jest.mock("@/server/services/endpoint_group.service", () => ({
  __esModule: true,
  default: {
    checkPermission: jest.fn(),
    getEndpointGroupById: jest.fn(),
    getOwnedEndpointGroupById: jest.fn(),
    endpointGroupExists: jest.fn(),
    updateEndpointGroupById: jest.fn(),
    deleteEndpointGroupById: jest.fn(),
  },
}));

import endpointGroupService from "@/server/services/endpoint_group.service";
import { GET, PUT, DELETE } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

const USER_PUBLIC_ID = "aaaaaaaaaaaa";
const PROJECT_PUBLIC_ID = "bbbbbbbbbbbb";
const GROUP_PUBLIC_ID = "cccccccccccc";

describe("src/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/route.ts", () => {
  const props = (projectId: string, endpointGroupId: string) => ({
    params: Promise.resolve({ projectId, endpointGroupId }),
  });

  // A write still asks first and refuses with 403, which is what every method but GET does.
  it("PUT returns 403 when permission denied", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(false);
    const res = await PUT(
      createJsonRequest({ name: "New" }, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
  });

  it("GET returns 403 when the group is there but belongs to somebody else", async () => {
    (endpointGroupService.getOwnedEndpointGroupById as jest.Mock).mockResolvedValue(null);
    (endpointGroupService.endpointGroupExists as jest.Mock).mockResolvedValue(true);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
  });

  it("GET returns 404 when endpoint group not found", async () => {
    (endpointGroupService.getOwnedEndpointGroupById as jest.Mock).mockResolvedValue(null);
    (endpointGroupService.endpointGroupExists as jest.Mock).mockResolvedValue(false);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("GET scopes the read to the owner and asks nothing else", async () => {
    (endpointGroupService.getOwnedEndpointGroupById as jest.Mock).mockResolvedValue({
      public_id: GROUP_PUBLIC_ID,
      name: "Group",
      _count: { endpoints: 0 },
    });
    await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );

    expect(endpointGroupService.getOwnedEndpointGroupById).toHaveBeenCalledWith({
      public_id: GROUP_PUBLIC_ID,
      owner: { user_public_id: USER_PUBLIC_ID, project_public_id: PROJECT_PUBLIC_ID },
    });
    expect(endpointGroupService.checkPermission).not.toHaveBeenCalled();
  });

  it("PUT returns 200 when updated", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (endpointGroupService.updateEndpointGroupById as jest.Mock).mockResolvedValue({
      public_id: GROUP_PUBLIC_ID,
      name: "New",
      _count: { endpoints: 0 },
    });
    const res = await PUT(
      createJsonRequest({ name: "New" }, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
  });

  it("DELETE returns 204 when service returns falsy", async () => {
    (endpointGroupService.checkPermission as jest.Mock).mockResolvedValue(true);
    (endpointGroupService.deleteEndpointGroupById as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID)
    );
    expect(res.status).toBe(204);
  });
});
