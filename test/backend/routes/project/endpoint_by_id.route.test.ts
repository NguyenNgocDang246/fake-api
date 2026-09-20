import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { ENDPOINT_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { createJsonRequest, expectError, expectSuccess, readJson } from "../../helpers/http";
import {
  endpointRow,
  scenarioRow,
  updateResult,
  writeBody,
  EndpointService,
  GET,
  PUT,
  DELETE,
  USER_PUBLIC_ID,
  PROJECT_PUBLIC_ID,
  GROUP_PUBLIC_ID,
  ENDPOINT_PUBLIC_ID,
  props,
} from "./endpoint_by_id_harness";

describe("endpoint by id route: GET, PUT, DELETE", () => {

  it("GET returns 403 when the endpoint is there but belongs to somebody else", async () => {
    (EndpointService.getOwnedEndpointById as jest.Mock).mockResolvedValue(null);
    (EndpointService.endpointExists as jest.Mock).mockResolvedValue(true);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
  });

  it("GET returns 404 when endpoint missing", async () => {
    (EndpointService.getOwnedEndpointById as jest.Mock).mockResolvedValue(null);
    (EndpointService.endpointExists as jest.Mock).mockResolvedValue(false);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("GET returns 200 when endpoint found", async () => {
    (EndpointService.getOwnedEndpointById as jest.Mock).mockResolvedValue(endpointRow());
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
  });

  // The read carries the ownership chain, so a row that comes back is one this user may see and
  // the answer costs one query rather than a permission check and then a read of the same row.
  it("GET scopes the read to the owner and asks nothing else", async () => {
    (EndpointService.getOwnedEndpointById as jest.Mock).mockResolvedValue(endpointRow());
    await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );

    expect(EndpointService.getOwnedEndpointById).toHaveBeenCalledWith({
      public_id: ENDPOINT_PUBLIC_ID,
      owner: {
        user_public_id: USER_PUBLIC_ID,
        project_public_id: PROJECT_PUBLIC_ID,
        endpoint_groups_public_id: GROUP_PUBLIC_ID,
      },
    });
    expect(EndpointService.checkPermission).not.toHaveBeenCalled();
    expect(EndpointService.endpointExists).not.toHaveBeenCalled();
  });

  // This read carries every scenario, so the count is simply how many came back.
  it("GET counts the scenarios it ships", async () => {
    (EndpointService.getOwnedEndpointById as jest.Mock).mockResolvedValue(
      endpointRow({ scenarios: [scenarioRow(), scenarioRow({ id: 2n, public_id: "ffffffffffff", is_active: false })] })
    );
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );

    await expectSuccess(res, 200);
    const body = await readJson(res);
    expect(body.data.scenario_count).toBe(2);
  });

  it("PUT returns 200 when updated", async () => {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.updateEndpointById as jest.Mock).mockResolvedValue(updateResult());
    const res = await PUT(
      createJsonRequest(
        writeBody(),
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
  });

  it("PUT returns 200 when path unchanged (matches its own record)", async () => {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      public_id: ENDPOINT_PUBLIC_ID,
    });
    (EndpointService.updateEndpointById as jest.Mock).mockResolvedValue(updateResult());
    const res = await PUT(
      createJsonRequest(
        writeBody(),
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
  });

  it("PUT returns 409 when new path/method collides with another endpoint", async () => {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      public_id: "other_endpoint",
    });
    const res = await PUT(
      createJsonRequest(
        writeBody(),
        { headers: { "x-userId": USER_PUBLIC_ID } }
      ),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.CONFLICT, ENDPOINT_MESSAGES.ENDPOINT_DUPLICATED);
    expect(EndpointService.updateEndpointById).not.toHaveBeenCalled();
  });

  it("DELETE returns 204 when service returns falsy", async () => {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.deleteEndpointById as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    expect(res.status).toBe(204);
  });
});
