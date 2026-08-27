import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { ENDPOINT_MESSAGES } from "@/server/services/endpoint/endpoint.constants";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";
import {
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

  it("GET returns 403 when permission denied", async () => {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(false);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.FORBIDDEN, ERROR_MESSAGES.FORBIDDEN);
  });

  it("GET returns 404 when endpoint missing", async () => {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointById as jest.Mock).mockResolvedValue(null);
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("GET returns 200 when endpoint found", async () => {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointById as jest.Mock).mockResolvedValue({
      public_id: ENDPOINT_PUBLIC_ID,
      path: "/x",
      method: "GET",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
      id: 1n,
      ai_enabled: false,
      ai_fields: [],
      ai_prompt: null,
    });
    const res = await GET(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    await expectSuccess(res, 200);
  });

  it("PUT returns 200 when updated", async () => {
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.updateEndpointById as jest.Mock).mockResolvedValue({
      public_id: ENDPOINT_PUBLIC_ID,
      path: "/x",
      method: "GET",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
      id: 1n,
      ai_enabled: false,
      ai_fields: [],
      ai_prompt: null,
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
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
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
      id: 1n,
      ai_enabled: false,
      ai_fields: [],
      ai_prompt: null,
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
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
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
    (EndpointService.checkPermission as jest.Mock).mockResolvedValue(true);
    (EndpointService.deleteEndpointById as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(
      createJsonRequest({}, { headers: { "x-userId": USER_PUBLIC_ID } }),
      props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
    );
    expect(res.status).toBe(204);
  });
});
