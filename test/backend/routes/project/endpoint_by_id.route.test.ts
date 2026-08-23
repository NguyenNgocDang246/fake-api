jest.mock("@/server/services/endpoint/endpoint.service", () => ({
  __esModule: true,
  default: {
    checkPermissions: jest.fn(),
    getEndpointById: jest.fn(),
    getEndpointByPath: jest.fn(),
    updateEndpointById: jest.fn(),
    deleteEndpointById: jest.fn(),
  },
}));

jest.mock("@/server/services/endpoint/endpoint_variant.service", () => ({
  __esModule: true,
  default: {
    clearVariants: jest.fn(),
    refillIfNeeded: jest.fn(),
  },
}));

import EndpointService from "@/server/services/endpoint/endpoint.service";
import endpointVariantService from "@/server/services/endpoint/endpoint_variant.service";
import { GET, PUT, DELETE } from "@/app/api/project/[projectId]/endpoint-group/[endpointGroupId]/endpoint/[endpointId]/route";
import { ENDPOINT_MESSAGES, ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, expectSuccess } from "../../helpers/http";

const afterQueue = jest.requireMock("next/server") as {
  __flushAfter: () => Promise<void>;
  __afterCount: () => number;
};

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
    (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
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

  describe("PUT invalidates the variant pool", () => {
    const AI_ROW = {
      public_id: ENDPOINT_PUBLIC_ID,
      path: "/x",
      method: "GET" as const,
      status_code: 200,
      delay_ms: 0,
      id: 1n,
      response_body: '{"name":"An"}',
      ai_enabled: true,
      ai_fields: ["name"],
      ai_prompt: null,
    };

    async function put(previous: object | null, updated: object, body: object) {
      (EndpointService.checkPermissions as jest.Mock).mockResolvedValue(true);
      (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
      (EndpointService.getEndpointById as jest.Mock).mockResolvedValue(previous);
      (EndpointService.updateEndpointById as jest.Mock).mockResolvedValue(updated);

      const res = await PUT(
        createJsonRequest(
          { method: "GET", path: "/x", status_code: 200, delay_ms: 0, ...body },
          { headers: { "x-userId": USER_PUBLIC_ID } }
        ),
        props(PROJECT_PUBLIC_ID, GROUP_PUBLIC_ID, ENDPOINT_PUBLIC_ID)
      );
      await expectSuccess(res, 200);
      await afterQueue.__flushAfter();
      return res;
    }

    it("clears and refills when the body changed", async () => {
      await put(
        AI_ROW,
        { ...AI_ROW, response_body: '{"name":"Binh"}' },
        { response_body: '{"name":"Binh"}', ai_enabled: true, ai_fields: ["name"] }
      );

      expect(endpointVariantService.clearVariants).toHaveBeenCalledWith(1n);
      expect(endpointVariantService.refillIfNeeded).toHaveBeenCalled();
    });

    it("clears and refills when the selected fields changed", async () => {
      const body = '{"name":"An","age":3}';
      await put(
        { ...AI_ROW, response_body: body },
        { ...AI_ROW, response_body: body, ai_fields: ["name", "age"] },
        { response_body: body, ai_enabled: true, ai_fields: ["name", "age"] }
      );

      expect(endpointVariantService.clearVariants).toHaveBeenCalledWith(1n);
    });

    it("leaves a good pool alone when only the field order changed", async () => {
      const previous = { ...AI_ROW, ai_fields: ["name", "age"] };
      const body = '{"name":"An","age":3}';
      await put(
        { ...previous, response_body: body },
        { ...previous, response_body: body, ai_fields: ["age", "name"] },
        { response_body: body, ai_enabled: true, ai_fields: ["age", "name"] }
      );

      expect(endpointVariantService.clearVariants).not.toHaveBeenCalled();
      expect(afterQueue.__afterCount()).toBe(0);
    });

    it("seeds the pool when AI is switched on without touching the body", async () => {
      await put(
        { ...AI_ROW, ai_enabled: false },
        AI_ROW,
        { response_body: '{"name":"An"}', ai_enabled: true, ai_fields: ["name"] }
      );

      expect(endpointVariantService.refillIfNeeded).toHaveBeenCalled();
    });

    it("clears the pool when AI is switched off", async () => {
      await put(
        AI_ROW,
        { ...AI_ROW, ai_enabled: false, ai_fields: [] },
        { response_body: '{"name":"An"}', ai_enabled: false, ai_fields: [] }
      );

      expect(endpointVariantService.clearVariants).toHaveBeenCalledWith(1n);
    });

    it("swallows a cleanup failure rather than rejecting after the response", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
      (endpointVariantService.clearVariants as jest.Mock).mockRejectedValue(new Error("db down"));

      await expect(
        put(
          AI_ROW,
          { ...AI_ROW, response_body: '{"name":"Binh"}' },
          { response_body: '{"name":"Binh"}', ai_enabled: true, ai_fields: ["name"] }
        )
      ).resolves.toBeDefined();

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
