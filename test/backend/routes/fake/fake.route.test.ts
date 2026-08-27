jest.mock("@/server/services/endpoint/endpoint.service", () => ({
  __esModule: true,
  default: {
    getEndpointByPath: jest.fn(),
    getEndpointByDynamicPath: jest.fn(),
    findMethodsForPath: jest.fn(),
  },
}));

jest.mock("@/server/services/endpoint/variant/plan.service", () => ({
  __esModule: true,
  default: {
    loadPlan: jest.fn(),
    ensurePlan: jest.fn(),
  },
}));

import EndpointService from "@/server/services/endpoint/endpoint.service";
import { GET, POST } from "@/app/api/fake/[projectId]/route";
import { ERROR_MESSAGES, STATUS_CODE } from "@/server/core/constants";
import { AppError } from "@/server/core/errors";
import { createJsonRequest, expectError, readJson } from "../../helpers/http";

describe("src/app/api/fake/[projectId]/route.ts", () => {
  it("answers an AppError as the standard envelope, like every other route", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockRejectedValue(
      new AppError({ message: ERROR_MESSAGES.SERVER_ERROR, statusCode: STATUS_CODE.SERVER_ERROR })
    );

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));
    await expectError(res, STATUS_CODE.SERVER_ERROR, ERROR_MESSAGES.SERVER_ERROR);
  });

  it("returns 404 when publicId missing", async () => {
    const res = await GET(createJsonRequest({}, { pathname: "/" }));
    await expectError(res, STATUS_CODE.NOT_FOUND, ERROR_MESSAGES.NOT_FOUND);
  });

  it("returns 404 when endpoint not found", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.getEndpointByDynamicPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.findMethodsForPath as jest.Mock).mockResolvedValue([]);
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

  it("returns 405 when the path exists under another method", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.getEndpointByDynamicPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.findMethodsForPath as jest.Mock).mockResolvedValue(["POST", "PUT"]);

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

    await expectError(res, STATUS_CODE.METHOD_NOT_ALLOWED, ERROR_MESSAGES.METHOD_NOT_ALLOWED);
    expect(await readJson(res)).toMatchObject({ errors: { allow: ["POST", "PUT"] } });
    expect(EndpointService.findMethodsForPath).toHaveBeenCalledWith({
      project_public_id: "PUBLIC",
      path: "/users",
    });
  });

  it("does not ask which methods exist when the endpoint was found", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      method: "GET",
      path: "/users",
      status_code: 200,
      response_body: "{}",
      delay_ms: 0,
    });

    const res = await GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));

    expect(res.status).toBe(200);
    expect(EndpointService.findMethodsForPath).not.toHaveBeenCalled();
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
});
