jest.mock("@/server/services/endpoint/endpoint.service", () => ({
  __esModule: true,
  default: {
    getEndpointByPath: jest.fn(),
    getEndpointByDynamicPath: jest.fn(),
    findMethodsForPath: jest.fn(),
  },
}));

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
import { GET } from "@/app/api/fake/[projectId]/route";
import { STATUS_CODE } from "@/server/core/constants";
import { createJsonRequest } from "../../helpers/http";

const base = {
  method: "GET",
  path: "/users",
  status_code: 200,
  response_body: "{}",
  response_headers: "[]",
  delay_ms: 0,
};

function serve(overrides: Partial<typeof base> = {}) {
  (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({ ...base, ...overrides });
  return GET(createJsonRequest({}, { pathname: "/PUBLIC/users" }));
}

beforeEach(() => {
  jest.clearAllMocks();
  (projectService.getCorsConfig as jest.Mock).mockResolvedValue({
    cors_enabled: true,
    cors_origins: [],
    cors_allow_credentials: false,
  });
});

describe("what a mock answers with when nobody set a header", () => {
  it("declares JSON in UTF-8", async () => {
    const res = await serve();

    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
  });

  // Bodies are edited constantly and an AI endpoint answers differently every call, so a cached
  // GET would show the author a response they already replaced.
  it("keeps the browser from caching the response", async () => {
    const res = await serve();

    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("headers the endpoint sets", () => {
  it("sends them alongside the body", async () => {
    const res = await serve({
      response_headers: JSON.stringify([
        { name: "X-Total-Count", value: "42" },
        { name: "ETag", value: '"v1"' },
      ]),
    });

    expect(res.headers.get("x-total-count")).toBe("42");
    expect(res.headers.get("etag")).toBe('"v1"');
  });

  // A header the browser cannot read is a header that may as well not have been sent, so the
  // name has to be exposed. Only a browser call gets that, which is why this one sends an Origin.
  it("names them so a browser is allowed to read them", async () => {
    (EndpointService.getEndpointByPath as jest.Mock).mockResolvedValue({
      ...base,
      response_headers: JSON.stringify([{ name: "X-Total-Count", value: "42" }]),
    });

    const res = await GET(
      createJsonRequest({}, { pathname: "/PUBLIC/users", headers: { origin: "http://localhost" } })
    );

    expect(res.headers.get("access-control-expose-headers")).toContain("x-total-count");
  });

  it("replaces a default rather than sitting beside it", async () => {
    const res = await serve({
      response_headers: JSON.stringify([
        { name: "Cache-Control", value: "max-age=60" },
        { name: "content-type", value: "text/plain" },
      ]),
    });

    expect(res.headers.get("cache-control")).toBe("max-age=60");
    expect(res.headers.get("content-type")).toBe("text/plain");
  });

  it("sends them on a 204, which carries no body but still carries headers", async () => {
    const res = await serve({
      status_code: STATUS_CODE.NO_CONTENT,
      response_headers: JSON.stringify([{ name: "Location", value: "/users/1" }]),
    });

    expect(res.status).toBe(STATUS_CODE.NO_CONTENT);
    expect(res.headers.get("location")).toBe("/users/1");
    expect(res.headers.get("content-type")).toBeNull();
  });

  // The model refuses these on the way in, but a row written before that rule never passed
  // through it. Serving one still answers, it just leaves the header out: failing the request
  // would take down a whole endpoint over a header nobody can see.
  it.each(["Set-Cookie", "Content-Length", "Access-Control-Allow-Origin"])(
    "answers normally and drops %s when a stored row carries it",
    async (name) => {
      const res = await serve({
        response_headers: JSON.stringify([
          { name, value: "anything" },
          { name: "X-Kept", value: "yes" },
        ]),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get(name)).not.toBe("anything");
      expect(res.headers.get("x-kept")).toBe("yes");
    }
  );

  it.each(["not json at all", '{"a":1}', ""])(
    "serves the endpoint anyway when the headers column reads %j",
    async (stored) => {
      const res = await serve({ response_headers: stored });

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    }
  );
});
