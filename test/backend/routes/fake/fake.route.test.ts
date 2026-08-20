jest.mock("@/server/services/endpoint.service", () => ({
  __esModule: true,
  default: { getEndpointByPath: jest.fn(), getEndpointByDynamicPath: jest.fn() },
}));

jest.mock("@/server/services/endpoint_variant.service", () => ({
  __esModule: true,
  default: {
    pickVariant: jest.fn(),
    markVariantUsed: jest.fn(),
    refillIfNeeded: jest.fn(),
  },
}));

import EndpointService from "@/server/services/endpoint.service";
import EndpointVariantService from "@/server/services/endpoint_variant.service";
import { GET, POST } from "@/app/api/fake/[projectId]/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest, expectError, readJson } from "../../helpers/http";

describe("src/app/api/fake/[projectId]/route.ts", () => {
  it("returns 404 when publicId missing", async () => {
    const res = await GET(createJsonRequest({}, { pathname: "/" }));
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("returns 404 when endpoint not found", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.getEndpointByDynamicPath as jest.Mock).mockResolvedValue(null);
    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("does not query dynamic path when a static match is found", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      method: "GET",
      path: "/users",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));
    expect(res.status).toBe(200);
    expect(EndpointService.getEndpointByDynamicPath).not.toHaveBeenCalled();
  });

  it("falls back to dynamic path match when static match misses", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.getEndpointByDynamicPath as jest.Mock).mockResolvedValue({
      method: "GET",
      path: "/user/:id",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/user/abc123" }));
    expect(res.status).toBe(200);
    expect(EndpointService.getEndpointByDynamicPath).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/user/abc123", method: "GET" })
    );
  });

  it("returns 405 when method mismatches", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      method: "POST",
      path: "/users",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));
    await expectError(res, STATUS_CODE.METHOD_NOT_ALLOWED, ERROR_MESSAGES.METHOD_NOT_ALLOWED);
  });

  it("returns 204 when endpoint status_code is NO_CONTENT", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      method: "GET",
      path: "/users",
      status_code: STATUS_CODE.NO_CONTENT,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));
    expect(res.status).toBe(204);
  });

  it("ignores query string when matching endpoint path", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      method: "GET",
      path: "/users",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users?active=true" }));
    expect(res.status).toBe(200);
    expect(EndpointService.getEndpointByPath).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users" })
    );
  });

  it("ignores hash fragment when matching endpoint path", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      method: "GET",
      path: "/users",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });
    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users#section" }));
    expect(res.status).toBe(200);
    expect(EndpointService.getEndpointByPath).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users" })
    );
  });

  it("honors delay_ms (fake timers)", async () => {
    jest.useFakeTimers();
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      method: "POST",
      path: "/users",
      status_code: 200,
      response_body: "{}",
      delay_ms: 50,
    });

    const promise = POST(createJsonRequest({}, { pathname: "/PUBLIC/users" }));
    await jest.advanceTimersByTimeAsync(50);
    const res = await promise;
    expect(res.status).toBe(200);
    jest.useRealTimers();
  });

  describe("AI variants", () => {
    const aiEndpoint = {
      id: 7n,
      method: "GET",
      path: "/users",
      status_code: 200,
      response_body: '{"name":"An","id":1}',
      delay_ms: 0,
      ai_enabled: true,
      ai_fields: ["name"],
      ai_prompt: null,
    };

    it("serves the base body when the pool is empty", async () => {
      (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(aiEndpoint);
      (EndpointVariantService.pickVariant as jest.Mock).mockResolvedValue(null);

      const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ name: "An", id: 1 });
    });

    it("serves a variant when the pool has one", async () => {
      (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(aiEndpoint);
      (EndpointVariantService.pickVariant as jest.Mock).mockResolvedValue({
        id: 3n,
        response_body: '{"name":"Binh","id":1}',
      });

      const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ name: "Binh", id: 1 });
    });

    it("falls back to the base body when the pool read fails", async () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
      (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(aiEndpoint);
      (EndpointVariantService.pickVariant as jest.Mock).mockRejectedValue(new Error("db down"));

      const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

      // A broken AI path must never turn a working fake endpoint into a 500.
      expect(res.status).toBe(200);
      expect(await readJson(res)).toEqual({ name: "An", id: 1 });

      consoleError.mockRestore();
    });

    it("does not touch the pool when AI is off", async () => {
      (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
        ...aiEndpoint,
        ai_enabled: false,
      });

      const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

      expect(res.status).toBe(200);
      expect(EndpointVariantService.pickVariant).not.toHaveBeenCalled();
    });

    it("does not touch the pool when AI is on but no field is selected", async () => {
      (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
        ...aiEndpoint,
        ai_fields: [],
      });

      await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

      expect(EndpointVariantService.pickVariant).not.toHaveBeenCalled();
    });

    it("defers the use counter and the refill until after the response", async () => {
      const server = jest.requireMock("next/server") as {
        __afterCount: () => number;
        __flushAfter: () => Promise<void>;
      };
      (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(aiEndpoint);
      (EndpointVariantService.pickVariant as jest.Mock).mockResolvedValue({
        id: 3n,
        response_body: '{"name":"Binh","id":1}',
      });

      await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

      // Nothing ran while the request was being served.
      expect(EndpointVariantService.markVariantUsed).not.toHaveBeenCalled();
      expect(EndpointVariantService.refillIfNeeded).not.toHaveBeenCalled();
      expect(server.__afterCount()).toBe(1);

      await server.__flushAfter();

      expect(EndpointVariantService.markVariantUsed).toHaveBeenCalledWith(3n);
      expect(EndpointVariantService.refillIfNeeded).toHaveBeenCalledWith(aiEndpoint);
    });
  });
});

