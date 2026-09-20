jest.mock("@/server/services/project.service", () => ({
  __esModule: true,
  default: { checkPermission: jest.fn(), projectExists: jest.fn() },
}));
jest.mock("@/server/services/endpoint_group.service", () => ({
  __esModule: true,
  default: {
    getAllEndpointGroups: jest.fn(),
    getOwnedEndpointGroups: jest.fn(),
    createEndpointGroup: jest.fn(),
    canCreateEndpointGroup: jest.fn(),
  },
}));

import ProjectService from "@/server/services/project.service";
import EndpointGroupService from "@/server/services/endpoint_group.service";
import { GET, POST } from "@/app/api/project/[projectId]/endpoint-group/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess, readJson } from "../../helpers/http";

const USER_PUBLIC_ID = "aaaaaaaaaaaa";
const PROJECT_PUBLIC_ID = "bbbbbbbbbbbb";
const GROUP_PUBLIC_ID = "cccccccccccc";

describe("src/app/api/project/[projectId]/endpoint-group/route.ts", () => {
  const props = (projectId: string) => ({ params: Promise.resolve({ projectId }) });

  beforeEach(() => {
    (EndpointGroupService.canCreateEndpointGroup as jest.Mock).mockResolvedValue(true);
  });

  it("GET returns 403 when the empty answer was somebody else's project", async () => {
    (EndpointGroupService.getOwnedEndpointGroups as jest.Mock).mockResolvedValue([]);
    (ProjectService.checkPermission as jest.Mock).mockResolvedValue(false);
    (ProjectService.projectExists as jest.Mock).mockResolvedValue(true);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
  });

  it("GET returns 404 when the empty answer was a project that is not there", async () => {
    (EndpointGroupService.getOwnedEndpointGroups as jest.Mock).mockResolvedValue([]);
    (ProjectService.checkPermission as jest.Mock).mockResolvedValue(false);
    (ProjectService.projectExists as jest.Mock).mockResolvedValue(false);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("GET returns 204 when list empty", async () => {
    (ProjectService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointGroupService.getOwnedEndpointGroups as jest.Mock).mockResolvedValue([]);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID)
    );
    expect(res.status).toBe(204);
  });

  it("GET scopes the list to the owner and asks nothing else", async () => {
    (EndpointGroupService.getOwnedEndpointGroups as jest.Mock).mockResolvedValue([
      { public_id: GROUP_PUBLIC_ID, name: "Group", _count: { endpoints: 0 } },
    ]);
    await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID)
    );

    expect(EndpointGroupService.getOwnedEndpointGroups).toHaveBeenCalledWith({
      public_id: PROJECT_PUBLIC_ID,
      owner: { user_public_id: USER_PUBLIC_ID },
    });
    expect(ProjectService.checkPermission).not.toHaveBeenCalled();
  });

  it("GET returns 200 with list", async () => {
    (ProjectService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointGroupService.getOwnedEndpointGroups as jest.Mock).mockResolvedValue([
      { public_id: GROUP_PUBLIC_ID, name: "Group", _count: { endpoints: 0 } },
    ]);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
    const body = await readJson(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0]).toMatchObject({ name: "Group" });
  });

  it("POST creates endpoint group", async () => {
    (ProjectService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointGroupService.createEndpointGroup as jest.Mock).mockResolvedValue({
      public_id: GROUP_PUBLIC_ID,
      name: "Group",
    });
    const res = await POST(
      createJsonRequest({ name: "Group" }, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
  });

  it("POST returns 400 for invalid body (strict)", async () => {
    (ProjectService.checkPermission as jest.Mock).mockResolvedValue(true);
    const res = await POST(
      createJsonRequest(
        { name: "Group", extra: true },
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.BAD_REQUEST, ERROR_MESSAGES.VALIDATION_FAILED);
  });
});
