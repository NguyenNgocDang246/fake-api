jest.mock("@/server/services/endpoint/endpoint.service", () =>
  jest.requireActual("./fake_fixture").endpointServiceMock()
);

jest.mock("@/server/services/project.service", () => ({
  __esModule: true,
  default: { getCorsConfig: jest.fn() },
}));

jest.mock("@/server/services/endpoint/variant/plan.service", () => ({
  __esModule: true,
  default: { loadRenderable: jest.fn(), ensurePlan: jest.fn() },
}));

import EndpointService from "@/server/services/endpoint/endpoint.service";
import projectService from "@/server/services/project.service";
import {
  DELETE as deleteRoute,
  GET as getRoute,
  OPTIONS as optionsRoute,
} from "@/app/api/fake/[projectId]/route";
import type { NextRequest } from "next/server";
import { STATUS_CODE } from "@/server/core/constants";
import { servable } from "./fake_fixture";
import { createJsonRequest, createRouteParams } from "../../helpers/http";

// Every case here is about the CORS negotiation, not about which project answers, so the route
// params are bound once and each verb is called with the request alone.
const PARAMS = createRouteParams({ projectId: "PUBLIC" });
const GET = (req: NextRequest) => getRoute(req, PARAMS);
const DELETE = (req: NextRequest) => deleteRoute(req, PARAMS);
const OPTIONS = (req: NextRequest) => optionsRoute(req, PARAMS);

const ORIGIN = "http://localhost:5173";

const OPEN_CORS = { cors_enabled: true, cors_origins: [], cors_allow_credentials: false };

const endpoint = {
  method: "GET",
  path: "/users",
  status_code: 200,
  response_body: "{}",
  response_headers: "[]",
  delay_ms: 0,
};

function fromBrowser(pathname = "/users", headers: Record<string, string> = {}) {
  return createJsonRequest({}, { pathname, headers: { origin: ORIGIN, ...headers } });
}

beforeEach(() => {
  jest.clearAllMocks();
  (projectService.getCorsConfig as jest.Mock).mockResolvedValue(OPEN_CORS);
  (EndpointService.getServableEndpointByPath as jest.Mock).mockResolvedValue(servable(endpoint));
});

describe("a call with no Origin is left exactly as it was", () => {
  it("sends no CORS header and never asks for the project's settings", async () => {
    const res = await GET(createJsonRequest({}, { pathname: "/users" }));

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(projectService.getCorsConfig).not.toHaveBeenCalled();
  });
});

describe("a browser call against the defaults", () => {
  it("is allowed from any origin", async () => {
    const res = await GET(fromBrowser());

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-credentials")).toBeNull();
  });

  // Without these the browser hides the status behind an opaque CORS failure, which is exactly
  // the case where the author most needs to see what came back.
  it("carries the headers on a 404 too", async () => {
    (EndpointService.getServableEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.getServableEndpointByDynamicPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.findMethodsForPath as jest.Mock).mockResolvedValue([]);

    const res = await GET(fromBrowser());

    expect(res.status).toBe(STATUS_CODE.NOT_FOUND);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("carries the headers on a 405, and names the methods that do exist", async () => {
    (EndpointService.getServableEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.getServableEndpointByDynamicPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.findMethodsForPath as jest.Mock).mockResolvedValue(["POST", "PUT"]);

    const res = await GET(fromBrowser());

    expect(res.status).toBe(STATUS_CODE.METHOD_NOT_ALLOWED);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("allow")).toBe("POST, PUT");
    expect(res.headers.get("access-control-expose-headers")).toContain("allow");
  });

  it("carries the headers when the handler throws", async () => {
    (EndpointService.getServableEndpointByPath as jest.Mock).mockRejectedValue(new Error("boom"));

    const res = await GET(fromBrowser());

    expect(res.status).toBe(STATUS_CODE.SERVER_ERROR);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("answers a project that does not exist without CORS headers", async () => {
    (projectService.getCorsConfig as jest.Mock).mockResolvedValue(null);
    (EndpointService.getServableEndpointByPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.getServableEndpointByDynamicPath as jest.Mock).mockResolvedValue(null);
    (EndpointService.findMethodsForPath as jest.Mock).mockResolvedValue([]);

    const res = await GET(fromBrowser());

    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("an origin list narrows who gets through", () => {
  it("echoes an origin that is on the list, and varies on it", async () => {
    (projectService.getCorsConfig as jest.Mock).mockResolvedValue({
      ...OPEN_CORS,
      cors_origins: [ORIGIN],
    });

    const res = await GET(fromBrowser());

    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(res.headers.get("vary")).toContain("Origin");
  });

  it("matches the origin case-insensitively", async () => {
    (projectService.getCorsConfig as jest.Mock).mockResolvedValue({
      ...OPEN_CORS,
      cors_origins: ["HTTP://LOCALHOST:5173"],
    });

    const res = await GET(fromBrowser());

    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });

  it("sends nothing to an origin that is not on the list", async () => {
    (projectService.getCorsConfig as jest.Mock).mockResolvedValue({
      ...OPEN_CORS,
      cors_origins: ["http://example.com"],
    });

    const res = await GET(fromBrowser());

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  // A wildcard origin next to credentials is a pair the browser refuses outright.
  it("never answers a credentialed project with a wildcard", async () => {
    (projectService.getCorsConfig as jest.Mock).mockResolvedValue({
      cors_enabled: true,
      cors_origins: [ORIGIN],
      cors_allow_credentials: true,
    });

    const res = await GET(fromBrowser());

    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });
});

describe("turning CORS off", () => {
  it("still answers, it just says nothing the browser can act on", async () => {
    (projectService.getCorsConfig as jest.Mock).mockResolvedValue({
      ...OPEN_CORS,
      cors_enabled: false,
    });

    const res = await GET(fromBrowser());

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("the preflight", () => {
  it("answers 204 with the methods, the requested headers and a max age", async () => {
    const res = await OPTIONS(
      fromBrowser("/users", {
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type, x-api-key",
      })
    );

    expect(res.status).toBe(STATUS_CODE.NO_CONTENT);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("PATCH");
    expect(res.headers.get("access-control-allow-headers")).toBe("content-type, x-api-key");
    expect(res.headers.get("access-control-max-age")).toBe("600");
  });

  // Passing here is what lets the real request through to the 404 that explains the typo.
  it("passes for a path no endpoint answers on, without looking one up", async () => {
    const res = await OPTIONS(fromBrowser("/not-created-yet"));

    expect(res.status).toBe(STATUS_CODE.NO_CONTENT);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(EndpointService.getServableEndpointByPath).not.toHaveBeenCalled();
  });

  it("falls back to the usual headers when the browser names none", async () => {
    const res = await OPTIONS(fromBrowser());

    expect(res.headers.get("access-control-allow-headers")).toBe("Content-Type, Authorization");
  });

  it("answers a plain OPTIONS with an Allow header and no lookup", async () => {
    const res = await OPTIONS(createJsonRequest({}, { pathname: "/users" }));

    expect(res.status).toBe(STATUS_CODE.NO_CONTENT);
    expect(res.headers.get("allow")).toContain("OPTIONS");
    expect(projectService.getCorsConfig).not.toHaveBeenCalled();
  });

  it("is a 404 when the project does not exist", async () => {
    (projectService.getCorsConfig as jest.Mock).mockResolvedValue(null);

    const res = await OPTIONS(fromBrowser());

    expect(res.status).toBe(STATUS_CODE.NOT_FOUND);
  });
});

describe("every verb is covered, not only GET", () => {
  it("answers a DELETE from a browser with the same headers", async () => {
    (EndpointService.getServableEndpointByPath as jest.Mock).mockResolvedValue({
      ...endpoint,
      method: "DELETE",
    });

    const res = await DELETE(fromBrowser());

    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });
});
